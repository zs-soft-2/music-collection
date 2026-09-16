import {
	AlbumView,
	ArtistTileView,
	ArtistView,
	FORMAT_LABELS,
	ReleaseView,
} from '../../shared/music-ui';

export interface CountDatum {
	label: string;
	count: number;
}

/** Releases per decade of the album's release year, in chronological order. */
export function decadeDistribution(releases: ReleaseView[]): CountDatum[] {
	const counts = new Map<number, number>();

	for (const release of releases) {
		if (release.year !== null) {
			const decade = Math.floor(release.year / 10) * 10;
			counts.set(decade, (counts.get(decade) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort(([a], [b]) => a - b)
		.map(([decade, count]) => ({ label: `${decade}s`, count }));
}

/** The most frequent styles across the collection. */
export function topStyles(
	releases: ReleaseView[],
	limit: number
): CountDatum[] {
	const counts = new Map<string, number>();

	for (const release of releases) {
		for (const style of release.styles) {
			counts.set(style, (counts.get(style) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
		.slice(0, limit)
		.map(([label, count]) => ({ label, count }));
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
