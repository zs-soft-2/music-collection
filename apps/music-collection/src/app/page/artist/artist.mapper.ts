import { ArtistEntity } from '@music-collection/api';

import {
	AlbumView,
	ArtistTileView,
	ArtistView,
	FORMAT_ORDER,
	MediaFormat,
	ReleaseView,
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

export interface DiscographyAlbum extends AlbumView {
	/** Formats of this album in the collection; empty when not collected. */
	ownedFormats: MediaFormat[];
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

/** Genres are stored as "Rock" or as enum keys like "THRASH_METAL". */
export function formatGenre(genre: unknown): string | null {
	if (typeof genre !== 'string' || !genre.trim()) {
		return null;
	}
	return genre
		.toLowerCase()
		.split(/[_\s]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
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

/** The artist's albums, oldest first, with the formats owned of each. */
export function toDiscography(
	albums: AlbumView[],
	releases: ReleaseView[]
): DiscographyAlbum[] {
	const owned = new Map<string, Set<MediaFormat>>();

	for (const release of releases) {
		const formats = owned.get(release.albumId) ?? new Set<MediaFormat>();
		formats.add(release.format);
		owned.set(release.albumId, formats);
	}

	return albums
		.map((album) => ({
			...album,
			ownedFormats: FORMAT_ORDER.filter((format) =>
				owned.get(album.id)?.has(format)
			),
		}))
		.sort(
			(a, b) =>
				(a.year ?? Number.MAX_SAFE_INTEGER) -
					(b.year ?? Number.MAX_SAFE_INTEGER) ||
				a.title.localeCompare(b.title)
		);
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
