import { ReleaseView } from './music-ui.model';

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

/** The most frequent styles across the given releases or albums. */
export function topStyles(
	items: { styles: string[] }[],
	limit: number
): CountDatum[] {
	const counts = new Map<string, number>();

	for (const item of items) {
		for (const style of item.styles) {
			counts.set(style, (counts.get(style) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
		.slice(0, limit)
		.map(([label, count]) => ({ label, count }));
}
