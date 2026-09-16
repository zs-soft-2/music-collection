import {
	ArtistType,
	ContributionEntity,
	MembershipEntity,
	MusicianEntity,
} from '@music-collection/api';

import {
	CreditCategory,
	creditCategory,
	performerOrder,
} from '../../shared/music-ui/credit-roles';
import { toDiscography } from '../../shared/music-ui/music-ui.mapper';
import {
	AlbumView,
	ArtistView,
	DiscographyAlbum,
	ReleaseView,
} from '../../shared/music-ui/music-ui.model';
import {
	SiteLink,
	cleanDescription,
	toParagraphs,
	toSiteLinks,
} from '../artist/artist.mapper';
import {
	Span,
	formatSpan,
	membershipYears,
	overlapOf,
	spanOf,
} from '../network/network.mapper';

export interface MusicianHeaderView {
	uid: string;
	name: string;
	/** Birth name, only when it differs from the name. */
	realName: string | null;
	imageUrl: string | null;
	/** Biography split into readable paragraphs, markup removed. */
	paragraphs: string[];
	/** Other names the musician performed under. */
	aliases: string[];
	sites: SiteLink[];
	/** Link to the musician on Discogs, when the id is known. */
	discogsUrl: string | null;
}

/** A band the musician played in, as member or guest. */
export interface MusicianBandView {
	artistUid: string;
	name: string;
	/** Null when the band is not in the catalog (no page to link to). */
	artist: ArtistView | null;
	type: ArtistType | null;
	kind: 'member' | 'guest';
	/** Performing roles, most defining first. */
	instruments: string[];
	/** "1987–2008", "1983–present" or null when the years are unknown. */
	years: string | null;
	/** Years on record for the time bar; `to` is this year while active. */
	span: Span | null;
	active: boolean;
	albumCount: number;
	collectedReleases: number;
}

/** An album the musician is credited on, with the roles. */
export interface MusicianAlbumView extends DiscographyAlbum {
	/** Roles on the album, e.g. "Guitar (Lead)", "Written-By". */
	roles: string[];
	categories: CreditCategory[];
}

export interface BandmateView {
	musicianUid: string;
	name: string;
	/** The bands they played in together, with the shared years. */
	together: { band: string; years: string; active: boolean }[];
	active: boolean;
}

/** Years covered by all bands, for drawing the time bars. */
export function bandsSpan(bands: MusicianBandView[]): Span | null {
	const spans = bands
		.map((band) => band.span)
		.filter((span): span is Span => !!span);

	return spans.length
		? {
				from: Math.min(...spans.map((span) => span.from)),
				to: Math.max(...spans.map((span) => span.to)),
				active: spans.some((span) => span.active),
			}
		: null;
}

export interface MusicianSummary {
	/** Most defining instruments across bands and credits. */
	instruments: string[];
	/** First and last year on record, from the memberships. */
	span: string | null;
	bands: number;
	guestAppearances: number;
}

/** Credit category filter of the album list; `all` shows every credit. */
export type AlbumRoleFilter = 'all' | CreditCategory;

/** Supporting parts (backing vocals etc.) never define a musician's role. */
const SECONDARY_ROLE = /backing|harmony|gang|additional|choir|chorus|^voice$/i;

const instrumentOrder = (role: string) =>
	performerOrder(role) + (SECONDARY_ROLE.test(role) ? 10 : 0);

const sortInstruments = (instruments: Iterable<string>) =>
	[...new Set(instruments)].sort(
		(a, b) => instrumentOrder(a) - instrumentOrder(b) || a.localeCompare(b)
	);

const roleLabel = (contribution: ContributionEntity) =>
	contribution.roleDetail
		? `${contribution.role} (${contribution.roleDetail})`
		: contribution.role;

export function toMusicianHeader(
	uid: string,
	musician: MusicianEntity | null,
	memberships: MembershipEntity[],
	contributions: ContributionEntity[]
): MusicianHeaderView | null {
	const name =
		musician?.name ??
		memberships[0]?.musicianName ??
		contributions[0]?.name ??
		null;

	if (!name) {
		return null;
	}
	const discogsId =
		musician?.discogsId ?? (Number(uid.replace('discogs-', '')) || null);

	const realName = musician?.realName?.trim() || null;

	return {
		uid,
		name,
		realName: realName && realName !== name ? realName : null,
		imageUrl: musician?.imageUrl || null,
		paragraphs: toParagraphs(cleanDescription(musician?.description)),
		aliases: musician?.aliases ?? [],
		// The Discogs link is shown on its own.
		sites: toSiteLinks(musician?.sites).filter(
			(site) => site.label !== 'discogs.com'
		),
		discogsUrl: discogsId
			? `https://www.discogs.com/artist/${discogsId}`
			: null,
	};
}

/**
 * The musician's bands: members before guests, current before former, then
 * in the order they joined.
 */
export function toMusicianBands(
	memberships: MembershipEntity[],
	artists: ArtistView[],
	releases: ReleaseView[],
	currentYear: number
): MusicianBandView[] {
	const artistsById = new Map(artists.map((artist) => [artist.id, artist]));

	return [...memberships]
		.sort(
			(a, b) =>
				Number(a.kind !== 'member') - Number(b.kind !== 'member') ||
				Number(!!b.active) - Number(!!a.active) ||
				(a.from ?? 9999) - (b.from ?? 9999) ||
				a.artistName.localeCompare(b.artistName)
		)
		.map((membership) => {
			const artist = artistsById.get(membership.artistUid) ?? null;

			return {
				artistUid: membership.artistUid,
				name: artist?.name ?? membership.artistName,
				artist,
				type: artist?.type ?? null,
				kind: membership.kind === 'member' ? 'member' : 'guest',
				instruments: sortInstruments(membership.instruments ?? []),
				years: membershipYears(membership, currentYear),
				span: spanOf(membership, currentYear),
				active: !!membership.active,
				albumCount: membership.albumCount ?? 0,
				collectedReleases: releases.filter(
					(release) => release.artistId === membership.artistUid
				).length,
			};
		});
}

/**
 * Albums the musician is credited on, oldest first, one entry per album with
 * all the roles; albums not in the catalog are left out.
 */
export function toMusicianAlbums(
	contributions: ContributionEntity[],
	albums: AlbumView[],
	releases: ReleaseView[]
): MusicianAlbumView[] {
	const roles = new Map<string, ContributionEntity[]>();

	for (const contribution of contributions) {
		const list = roles.get(contribution.albumUid) ?? [];
		list.push(contribution);
		roles.set(contribution.albumUid, list);
	}

	return toDiscography(
		albums.filter((album) => roles.has(album.id)),
		releases
	).map((album) => {
		const credits = roles.get(album.id) ?? [];

		return {
			...album,
			roles: [...new Set(credits.map(roleLabel))].sort(
				(a, b) =>
					instrumentOrder(a) - instrumentOrder(b) ||
					a.localeCompare(b)
			),
			categories: [
				...new Set(
					credits.map((credit) => creditCategory(credit.role))
				),
			],
		};
	});
}

/** Credit categories present on the albums, in a fixed order, with counts. */
export function albumRoleCounts(
	albums: MusicianAlbumView[]
): { category: CreditCategory; count: number }[] {
	const order: CreditCategory[] = [
		'performers',
		'songwriting',
		'production',
		'artwork',
		'other',
	];

	return order
		.map((category) => ({
			category,
			count: albums.filter((album) => album.categories.includes(category))
				.length,
		}))
		.filter((entry) => entry.count > 0);
}

/**
 * Musicians who were members of the same band at the same time, current
 * ones first; `lineups` are the full line-ups of the musician's bands.
 */
export function toBandmates(
	musicianUid: string,
	memberships: MembershipEntity[],
	lineups: MembershipEntity[][],
	currentYear: number
): BandmateView[] {
	const byArtist = new Map<string, MembershipEntity[]>();

	for (const membership of lineups.flat()) {
		const list = byArtist.get(membership.artistUid) ?? [];
		list.push(membership);
		byArtist.set(membership.artistUid, list);
	}

	const bandmates = new Map<string, BandmateView>();

	for (const own of memberships) {
		const span = spanOf(own, currentYear);

		if (own.kind !== 'member') {
			continue;
		}
		for (const other of byArtist.get(own.artistUid) ?? []) {
			if (other.musicianUid === musicianUid || other.kind !== 'member') {
				continue;
			}
			const otherSpan = spanOf(other, currentYear);
			// Unknown years: only count them as bandmates when both are current.
			const overlap: Span | null =
				span && otherSpan
					? overlapOf(span, otherSpan)
					: own.active && other.active
						? { from: currentYear, to: currentYear, active: true }
						: null;

			if (!overlap) {
				continue;
			}
			const bandmate = bandmates.get(other.musicianUid) ?? {
				musicianUid: other.musicianUid,
				name: other.musicianName,
				together: [],
				active: false,
			};
			bandmate.together.push({
				band: own.artistName,
				years:
					span && otherSpan ? formatSpan(overlap) : 'Current members',
				active: overlap.active,
			});
			bandmate.active ||= overlap.active;
			bandmates.set(other.musicianUid, bandmate);
		}
	}

	return [...bandmates.values()].sort(
		(a, b) =>
			Number(b.active) - Number(a.active) ||
			b.together.length - a.together.length ||
			a.name.localeCompare(b.name)
	);
}

export function toMusicianSummary(
	memberships: MembershipEntity[],
	contributions: ContributionEntity[],
	currentYear: number
): MusicianSummary {
	const counts = new Map<string, number>();
	const count = (instrument: string) =>
		counts.set(instrument, (counts.get(instrument) ?? 0) + 1);

	for (const membership of memberships) {
		(membership.instruments ?? []).forEach(count);
	}
	for (const contribution of contributions) {
		if (creditCategory(contribution.role) === 'performers') {
			count(contribution.role);
		}
	}

	const spans = memberships
		.map((membership) => spanOf(membership, currentYear))
		.filter((span): span is Span => !!span);

	return {
		instruments: [...counts.entries()]
			.filter(([instrument]) => !SECONDARY_ROLE.test(instrument))
			.sort(
				(a, b) =>
					b[1] - a[1] ||
					instrumentOrder(a[0]) - instrumentOrder(b[0]) ||
					a[0].localeCompare(b[0])
			)
			.slice(0, 4)
			.map(([instrument]) => instrument),
		span: spans.length
			? formatSpan({
					from: Math.min(...spans.map((span) => span.from)),
					to: Math.max(...spans.map((span) => span.to)),
					active: spans.some((span) => span.active),
				})
			: null,
		bands: new Set(
			memberships
				.filter((membership) => membership.kind === 'member')
				.map((membership) => membership.artistUid)
		).size,
		guestAppearances: new Set(
			memberships
				.filter((membership) => membership.kind !== 'member')
				.map((membership) => membership.artistUid)
		).size,
	};
}
