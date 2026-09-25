import { AlbumEntity, ContributionEntity } from '@music-collection/api';
import { creditCategory } from '@music-collection/ui/music-view';

import { toCatalogInstruments } from './instruments';

/** One musician the line-up could take in, from either source. */
export interface LineupCandidate {
	/** The catalog's musician, or null when the name is not in it yet. */
	musicianUid: string | null;
	musicianName: string;
	kind: 'member' | 'guest';
	instruments: string[];
	from: number | null;
	to: number | null;
	active: boolean;
	albumCount: number;
	albumUids: string[];
	/** Which source knows this row; a merged one counts as musicbrainz. */
	source: 'musicbrainz' | 'catalog';
}

/** The `member of band` relations of a band, as MusicBrainz returns them. */
export interface MusicBrainzRelation {
	type?: string;
	direction?: string;
	artist?: { id?: string; name?: string };
	begin?: string | null;
	end?: string | null;
	ended?: boolean;
	attributes?: string[];
}

export interface MusicBrainzBand {
	id?: string;
	name?: string;
	relations?: MusicBrainzRelation[];
}

/** Relation attributes that say something other than an instrument. */
const ROLE_ATTRIBUTES = new Set(['original', 'additional']);

/** Name for matching people across the sources: case and marks left out. */
export const nameKey = (name: string): string =>
	name
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]/gu, '');

/** "lead vocals" → "Lead Vocals", the spelling the credits use. */
const titleCase = (text: string): string =>
	text.replace(/\p{Ll}+/gu, (word) => word[0].toUpperCase() + word.slice(1));

/** The year of a MusicBrainz date ("1985", "1985-06-13"); null when absent. */
const yearOf = (date: string | null | undefined): number | null => {
	const year = Number(String(date ?? '').slice(0, 4));

	return Number.isInteger(year) && year > 0 ? year : null;
};

/**
 * The band's line-up as MusicBrainz has it: the `member of band` relations,
 * which carry the years a Discogs member list does not. An `additional`
 * member is taken for a guest — that is what the attribute means.
 */
export function toExternalMembers(band: MusicBrainzBand): LineupCandidate[] {
	return (band.relations ?? [])
		.filter(
			(relation) =>
				relation.type === 'member of band' && !!relation.artist?.name
		)
		.map((relation) => {
			const attributes = relation.attributes ?? [];
			const to = yearOf(relation.end);

			return {
				musicianUid: null,
				musicianName: String(relation.artist?.name),
				kind: attributes.includes('additional')
					? ('guest' as const)
					: ('member' as const),
				instruments: toCatalogInstruments(
					attributes
						.filter((attribute) => !ROLE_ATTRIBUTES.has(attribute))
						.map(titleCase)
				),
				from: yearOf(relation.begin),
				to,
				// Ended, or dated to an end year: either way they left.
				active: !relation.ended && !to,
				albumCount: 0,
				albumUids: [],
				source: 'musicbrainz' as const,
			};
		});
}

/**
 * The line-up the catalog's own credits imply: who performed on the band's
 * albums, on what, and between which years. A credit that covers a whole
 * release counts as membership and a track-limited one as a guest turn —
 * the rule the Discogs import follows where it has no member list.
 */
export function toCatalogCandidates(
	albums: AlbumEntity[],
	contributions: ContributionEntity[],
	artistName: string
): LineupCandidate[] {
	const years = new Map(
		albums.map((album) => [album.uid, album.year?.getFullYear() ?? null])
	);
	const band = nameKey(artistName);
	const people = new Map<
		string,
		{
			name: string;
			instruments: Set<string>;
			albumUids: Set<string>;
			years: number[];
			releaseWide: boolean;
		}
	>();

	for (const contribution of contributions) {
		// The band credited as a whole is not a member of itself.
		if (nameKey(contribution.name ?? '') === band) {
			continue;
		}
		if (creditCategory(contribution.role) !== 'performers') {
			continue;
		}

		const person = people.get(contribution.musicianUid) ?? {
			name: contribution.name,
			instruments: new Set<string>(),
			albumUids: new Set<string>(),
			years: [],
			releaseWide: false,
		};

		person.instruments.add(contribution.role);
		person.albumUids.add(contribution.albumUid);

		const year = years.get(contribution.albumUid);

		if (year) {
			person.years.push(year);
		}
		if (!contribution.tracks) {
			person.releaseWide = true;
		}
		people.set(contribution.musicianUid, person);
	}

	return [...people.entries()].map(([musicianUid, person]) => ({
		musicianUid,
		musicianName: person.name,
		kind: person.releaseWide ? ('member' as const) : ('guest' as const),
		instruments: toCatalogInstruments([...person.instruments]),
		from: person.years.length ? Math.min(...person.years) : null,
		to: person.years.length ? Math.max(...person.years) : null,
		active: false,
		albumCount: person.albumUids.size,
		albumUids: [...person.albumUids],
		source: 'catalog' as const,
	}));
}

/**
 * The two sources as one list. Where both know a musician, MusicBrainz
 * decides the years and whether they are still in the band — it is the
 * source that knows them — and the catalog contributes the instruments it
 * has credits for and the album count.
 */
export function mergeCandidates(
	external: LineupCandidate[],
	catalog: LineupCandidate[]
): LineupCandidate[] {
	const byName = new Map(
		catalog.map((candidate) => [nameKey(candidate.musicianName), candidate])
	);
	const merged = external.map((member) => {
		const twin = byName.get(nameKey(member.musicianName));

		if (!twin) {
			return member;
		}
		byName.delete(nameKey(member.musicianName));

		return {
			...member,
			musicianUid: twin.musicianUid,
			instruments: [
				...new Set([...member.instruments, ...twin.instruments]),
			],
			from: member.from ?? twin.from,
			to: member.to ?? (member.active ? null : twin.to),
			albumCount: twin.albumCount,
			albumUids: twin.albumUids,
		};
	});

	return [...merged, ...byName.values()].sort(
		(a, b) =>
			Number(b.kind === 'member') - Number(a.kind === 'member') ||
			Number(!!b.active) - Number(!!a.active) ||
			(a.from ?? 9999) - (b.from ?? 9999) ||
			a.musicianName.localeCompare(b.musicianName)
	);
}
