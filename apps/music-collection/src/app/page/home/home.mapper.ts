import { ArtistTileView, ArtistView, ReleaseView } from '../../shared/music-ui';

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
