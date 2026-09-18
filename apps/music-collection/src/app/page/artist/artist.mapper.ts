import { ArtistEntity, MembershipEntity } from '@music-collection/api';

import {
	ArtistTileView,
	ArtistView,
	DiscographyAlbum,
	formatGenre,
	performerOrder,
	toArtistView,
} from '../../shared/music-ui';

export interface SiteLink {
	url: string;
	/** Host name without "www.", e.g. "metal-archives.com". */
	label: string;
}

export interface ArtistProfileView extends ArtistView {
	genre: string | null;
	/** Description split into readable paragraphs, markup removed. */
	paragraphs: string[];
	sites: SiteLink[];
}

export interface TypeCount {
	type: string;
	count: number;
}

/** Target paragraph length when splitting a long description. */
const PARAGRAPH_LENGTH = 420;

/**
 * Descriptions are imported from Discogs and carry its markup:
 * `[a=Name]`, `[url=…]text[/url]`, and id-only references such as
 * `[a2354458]`, `[r=1026346]` or `[m123]`.
 */
export function cleanDescription(text: unknown): string {
	if (typeof text !== 'string') {
		return '';
	}
	return text
		.replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/g, '$1')
		.replace(/\[[a-z]=(\d+)\]/gi, 'a related release')
		.replace(/\[[a-z]\d+\]/gi, 'a related act')
		.replace(/\[[a-z]=([^\]]+)\]/gi, '$1')
		.replace(/\[\/?[a-z]+\]/gi, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/** Splits a text into paragraphs of roughly {@link PARAGRAPH_LENGTH} chars. */
export function toParagraphs(text: string): string[] {
	if (!text) {
		return [];
	}
	const sentences = text.split(/(?<=[.!?])\s+(?=["'A-Z0-9])/);
	const paragraphs: string[] = [];
	let current = '';

	for (const sentence of sentences) {
		current = current ? `${current} ${sentence}` : sentence;
		if (current.length >= PARAGRAPH_LENGTH) {
			paragraphs.push(current);
			current = '';
		}
	}
	if (current) {
		paragraphs.push(current);
	}
	return paragraphs;
}

export function toSiteLinks(sites: unknown): SiteLink[] {
	if (!Array.isArray(sites)) {
		return [];
	}
	return sites
		.filter((site): site is string => typeof site === 'string')
		.flatMap((url) => {
			try {
				const { protocol, hostname } = new URL(url);

				return protocol === 'https:' || protocol === 'http:'
					? [{ url, label: hostname.replace(/^www\./, '') }]
					: [];
			} catch {
				return [];
			}
		});
}

export function toArtistProfile(artist: ArtistEntity): ArtistProfileView {
	return {
		...toArtistView(artist),
		genre: formatGenre(artist.genre),
		paragraphs: toParagraphs(cleanDescription(artist.description)),
		sites: toSiteLinks(artist.sites),
	};
}

/** Album types present in the discography, most frequent first. */
export function albumTypeCounts(albums: DiscographyAlbum[]): TypeCount[] {
	const counts = new Map<string, number>();

	for (const album of albums) {
		const type = album.albumType ?? 'Other';
		counts.set(type, (counts.get(type) ?? 0) + 1);
	}
	return Array.from(counts.entries())
		.map(([type, count]) => ({ type, count }))
		.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

/**
 * Artists sharing the most styles with `artist` (case-insensitive); ties are
 * broken by how many of their releases are collected.
 */
export function similarArtists(
	artist: ArtistView,
	artists: ArtistView[],
	releaseCounts: Map<string, number>,
	limit: number
): ArtistTileView[] {
	const styles = new Set(artist.styles.map((style) => style.toLowerCase()));

	if (!styles.size) {
		return [];
	}

	return artists
		.filter((other) => other.id !== artist.id && other.imageUrl)
		.map((other) => ({
			artist: other,
			shared: other.styles.filter((style) =>
				styles.has(style.toLowerCase())
			).length,
			releaseCount: releaseCounts.get(other.id) ?? 0,
		}))
		.filter((candidate) => candidate.shared > 0)
		.sort(
			(a, b) =>
				b.shared - a.shared ||
				b.releaseCount - a.releaseCount ||
				a.artist.name.localeCompare(b.artist.name)
		)
		.slice(0, limit)
		.map(({ artist: other, releaseCount }) => ({ ...other, releaseCount }));
}

export interface LineupMember {
	musicianUid: string;
	name: string;
	/** Performing roles, most defining first. */
	instruments: string[];
	from: number | null;
	to: number | null;
	active: boolean | null;
	/** "1987–2008", "1983–present" or null when the years are unknown. */
	years: string | null;
	albumCount: number;
}

export interface LineupView {
	members: LineupMember[];
	guests: LineupMember[];
	/** Years covered by the line-up, for drawing the time bars. */
	span: { from: number; to: number } | null;
}

/** Supporting parts (backing vocals etc.) never define a member's role. */
const SECONDARY_ROLE = /backing|harmony|gang|additional|choir|chorus|^voice$/i;

const instrumentOrder = (role: string) =>
	performerOrder(role) + (SECONDARY_ROLE.test(role) ? 10 : 0);

function toLineupMember(membership: MembershipEntity): LineupMember {
	const { from, to, active } = membership;
	const end = active ? 'present' : to !== from ? to : null;

	return {
		musicianUid: membership.musicianUid,
		name: membership.musicianName,
		instruments: [...new Set(membership.instruments ?? [])].sort(
			(a, b) =>
				instrumentOrder(a) - instrumentOrder(b) || a.localeCompare(b)
		),
		from,
		to,
		active,
		years: from
			? end
				? `${from}–${end}`
				: String(from)
			: active
				? 'Current member'
				: null,
		albumCount: membership.albumCount ?? 0,
	};
}

const instrumentRank = (member: LineupMember) =>
	member.instruments.length ? instrumentOrder(member.instruments[0]) : 99;

/**
 * Line-up of a band: current members first (by instrument), then former
 * members in the order they joined; guests by how many albums they are on.
 */
export function toLineup(
	memberships: MembershipEntity[],
	currentYear: number
): LineupView {
	const all = memberships.map(toLineupMember);
	const members = all
		.filter((_, index) => memberships[index].kind === 'member')
		.sort(
			(a, b) =>
				Number(!!b.active) - Number(!!a.active) ||
				(a.active ? instrumentRank(a) - instrumentRank(b) : 0) ||
				(a.from ?? 9999) - (b.from ?? 9999) ||
				instrumentRank(a) - instrumentRank(b) ||
				a.name.localeCompare(b.name)
		);
	const guests = all
		.filter((_, index) => memberships[index].kind !== 'member')
		.sort(
			(a, b) =>
				b.albumCount - a.albumCount || a.name.localeCompare(b.name)
		);

	const years = members
		.flatMap((member) => [
			member.from,
			member.active ? currentYear : member.to,
		])
		.filter((year): year is number => typeof year === 'number');

	return {
		members,
		guests,
		span: years.length
			? { from: Math.min(...years), to: Math.max(...years) }
			: null,
	};
}
