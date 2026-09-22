import { ARTIST_TYPE_OPTIONS, EntityCounts } from '@music-collection/api';

import {
	AlbumView,
	ArtistTileView,
	ArtistView,
	FORMAT_LABELS,
	ReleaseView,
} from '../../shared/music-ui';

/** One catalog-wide entity count shown in the catalog panel. */
export interface CatalogStat {
	label: string;
	count: number;
}

/** Entity types counted on the home page, in display order. */
export const CATALOG_TYPES: { type: string; label: string }[] = [
	{ type: 'Artist', label: 'Artists' },
	{ type: 'Album', label: 'Albums' },
	{ type: 'Label', label: 'Labels' },
	{ type: 'Release', label: 'Releases' },
	{ type: 'Musician', label: 'Musicians' },
	{ type: 'Track', label: 'Tracks' },
];

/** Catalog-wide live counts; types not counted (yet) are left out. */
export function catalogStats(counts: EntityCounts): CatalogStat[] {
	return CATALOG_TYPES.flatMap(({ type, label }) =>
		counts[type] === undefined ? [] : [{ label, count: counts[type] }]
	);
}

export function releaseCountsByArtist(
	releases: ReleaseView[]
): Map<string, number> {
	const counts = new Map<string, number>();

	for (const release of releases) {
		if (release.artistId) {
			counts.set(
				release.artistId,
				(counts.get(release.artistId) ?? 0) + 1
			);
		}
	}
	return counts;
}

/** Albums the catalog holds of each artist. */
export function albumCountsByArtist(albums: AlbumView[]): Map<string, number> {
	const counts = new Map<string, number>();

	for (const album of albums) {
		if (album.artistId) {
			counts.set(album.artistId, (counts.get(album.artistId) ?? 0) + 1);
		}
	}
	return counts;
}

/** Artists ordered by how many of their releases are in the collection. */
export function mostCollectedArtists(
	artists: ArtistView[],
	counts: Map<string, number>,
	limit: number
): ArtistTileView[] {
	return artists
		.map((artist) => ({
			...artist,
			releaseCount: counts.get(artist.id) ?? 0,
		}))
		.filter((artist) => artist.releaseCount > 0 && artist.imageUrl)
		.sort(
			(a, b) =>
				b.releaseCount - a.releaseCount || a.name.localeCompare(b.name)
		)
		.slice(0, limit);
}

/**
 * Artists ordered by how many albums of theirs the catalog holds — the
 * ranking when there is no collection to rank by, so the tiles name the
 * artist's country instead of a release count they do not stand for.
 */
export function mostCatalogedArtists(
	artists: ArtistView[],
	albumCounts: Map<string, number>,
	limit: number
): ArtistTileView[] {
	return artists
		.filter(
			(artist) => (albumCounts.get(artist.id) ?? 0) > 0 && artist.imageUrl
		)
		.sort(
			(a, b) =>
				(albumCounts.get(b.id) ?? 0) - (albumCounts.get(a.id) ?? 0) ||
				a.name.localeCompare(b.name)
		)
		.slice(0, limit)
		.map((artist) => ({ ...artist, releaseCount: 0 }));
}

/**
 * A row of the catalog on the home page: what the heading holds, a handful
 * of it shown. The same shape for albums and for artists.
 */
interface CatalogGroup {
	/** Stable `track` key — the style, the decade or the artist type. */
	key: string;
	label: string;
	/** Everything the catalog holds under the heading, not only the shown. */
	total: number;
}

export interface AlbumGroup extends CatalogGroup {
	albums: AlbumView[];
}

export interface ArtistGroup extends CatalogGroup {
	artists: ArtistTileView[];
}

/** Worth a cover first, then the newest — what a row leads with. */
const compareAlbums = (a: AlbumView, b: AlbumView): number =>
	Number(!!b.coverUrl) - Number(!!a.coverUrl) ||
	(b.year ?? 0) - (a.year ?? 0);

/**
 * The fullest groups first, each cut to the albums a row shows. A group of
 * one is left out: a row is a way through the catalog, not a stray cover.
 */
function toAlbumGroups(
	grouped: Map<string, AlbumView[]>,
	label: (key: string) => string,
	groupLimit: number,
	itemLimit: number
): AlbumGroup[] {
	return Array.from(grouped.entries())
		.filter(([, albums]) => albums.length > 1)
		.sort(([, a], [, b]) => b.length - a.length)
		.slice(0, groupLimit)
		.map(([key, albums]) => ({
			key,
			label: label(key),
			total: albums.length,
			albums: [...albums].sort(compareAlbums).slice(0, itemLimit),
		}));
}

function groupBy(
	albums: AlbumView[],
	keys: (album: AlbumView) => string[]
): Map<string, AlbumView[]> {
	const grouped = new Map<string, AlbumView[]>();

	for (const album of albums) {
		for (const key of keys(album)) {
			grouped.set(key, [...(grouped.get(key) ?? []), album]);
		}
	}
	return grouped;
}

/** Catalog albums by style; an album on several styles is in each of them. */
export function albumsByStyle(
	albums: AlbumView[],
	groupLimit: number,
	itemLimit: number
): AlbumGroup[] {
	return toAlbumGroups(
		groupBy(albums, (album) => album.styles),
		(style) => style,
		groupLimit,
		itemLimit
	);
}

/** Catalog albums by the decade of their release year. */
export function albumsByDecade(
	albums: AlbumView[],
	groupLimit: number,
	itemLimit: number
): AlbumGroup[] {
	return toAlbumGroups(
		groupBy(albums, (album) =>
			album.year === null ? [] : [`${Math.floor(album.year / 10) * 10}`]
		),
		(decade) => `${decade}s`,
		groupLimit,
		itemLimit
	);
}

/**
 * The artists of the catalog by what kind of act they are, bands first, each
 * group led by the artists it holds the most albums of.
 */
export function artistsByType(
	artists: ArtistView[],
	albumCounts: Map<string, number>,
	itemLimit: number
): ArtistGroup[] {
	return ARTIST_TYPE_OPTIONS.flatMap(({ label, value }) => {
		const ofType = artists.filter((artist) => artist.type === value);
		const shown = mostCatalogedArtists(ofType, albumCounts, itemLimit);

		return shown.length
			? [
					{
						key: value,
						label: `${label}s`,
						total: ofType.length,
						artists: shown,
					},
				]
			: [];
	});
}

/** The catalog entries written last: what a guest is shown as new. */
export function newInCatalog(albums: AlbumView[], limit: number): AlbumView[] {
	return [...albums]
		.filter((album) => album.changedAt > 0)
		.sort((a, b) => b.changedAt - a.changedAt)
		.slice(0, limit);
}

/** A random item, different from `exclude` when there is a choice. */
export function pickRandom<T>(items: T[], exclude?: T): T | null {
	const pool =
		items.length > 1 ? items.filter((item) => item !== exclude) : items;

	return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

export type HomeSearchKind = 'artist' | 'release' | 'album';

export interface HomeSearchItem {
	/** Unique across all groups — used as the option element id. */
	id: string;
	kind: HomeSearchKind;
	title: string;
	subtitle: string;
	imageUrl: string | null;
	link: string[];
}

export interface HomeSearchGroup {
	kind: HomeSearchKind;
	label: string;
	items: HomeSearchItem[];
}

const matches = (needle: string, ...texts: (string | null)[]) =>
	texts.some((text) => text?.toLocaleLowerCase().includes(needle));

/**
 * Quick search of the home page: matching artists, collected releases and
 * catalog albums not in the collection yet, `limit` of each.
 */
export function searchHome(
	query: string,
	artists: ArtistView[],
	releases: ReleaseView[],
	albums: AlbumView[],
	limit: number
): HomeSearchGroup[] {
	const needle = query.trim().toLocaleLowerCase();

	if (!needle) {
		return [];
	}

	const collectedAlbumIds = new Set(
		releases.map((release) => release.albumId)
	);

	const groups: HomeSearchGroup[] = [
		{
			kind: 'artist',
			label: 'Artists',
			items: artists
				.filter((artist) => matches(needle, artist.name))
				.slice(0, limit)
				.map((artist) => ({
					id: `artist-${artist.id}`,
					kind: 'artist',
					title: artist.name,
					subtitle: [artist.country, artist.formedYear]
						.filter(Boolean)
						.join(' · '),
					imageUrl: artist.imageUrl,
					link: ['/artist', artist.id],
				})),
		},
		{
			kind: 'release',
			label: 'In your collection',
			items: releases
				.filter((release) =>
					matches(needle, release.title, release.artistName)
				)
				.slice(0, limit)
				.map((release) => ({
					id: `release-${release.id}`,
					kind: 'release',
					title: release.title,
					subtitle: [
						release.artistName,
						release.year,
						FORMAT_LABELS[release.format],
					]
						.filter(Boolean)
						.join(' · '),
					imageUrl: release.coverUrl,
					link: ['/album', release.albumId],
				})),
		},
		{
			kind: 'album',
			label: 'In the catalog',
			items: albums
				.filter(
					(album) =>
						!collectedAlbumIds.has(album.id) &&
						matches(needle, album.title, album.artistName)
				)
				.slice(0, limit)
				.map((album) => ({
					id: `album-${album.id}`,
					kind: 'album',
					title: album.title,
					subtitle: [album.artistName, album.year]
						.filter(Boolean)
						.join(' · '),
					imageUrl: album.coverUrl,
					link: ['/album', album.id],
				})),
		},
	];

	return groups.filter((group) => group.items.length > 0);
}

/** Catalog albums of one decade and how many of them are in the collection. */
export interface DecadeCoverage {
	label: string;
	catalog: number;
	collected: number;
}

/**
 * Catalog albums per decade of their release year, in chronological order,
 * with the number of them that have at least one release in the collection.
 */
export function decadeCoverage(
	albums: AlbumView[],
	releases: ReleaseView[]
): DecadeCoverage[] {
	const collectedAlbumIds = new Set(
		releases.map((release) => release.albumId)
	);
	const decades = new Map<number, DecadeCoverage>();

	for (const album of albums) {
		if (album.year === null) {
			continue;
		}
		const decade = Math.floor(album.year / 10) * 10;
		const entry = decades.get(decade) ?? {
			label: `${decade}s`,
			catalog: 0,
			collected: 0,
		};

		entry.catalog++;
		if (collectedAlbumIds.has(album.id)) {
			entry.collected++;
		}
		decades.set(decade, entry);
	}

	return Array.from(decades.entries())
		.sort(([a], [b]) => a - b)
		.map(([, entry]) => entry);
}
