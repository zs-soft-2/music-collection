import { CountDatum, MediaFormat, ReleaseView } from '../../shared/music-ui';

import { GROWTH_MONTHS, RECENT_WINDOW_DAYS } from './overview.model';

const DAY = 24 * 60 * 60 * 1000;

/** The first instant of the month the given moment falls in. */
function startOfMonth(at: Date): Date {
	return new Date(at.getFullYear(), at.getMonth(), 1);
}

/** How many copies arrived inside the recent window. */
export function addedRecently(
	releases: ReleaseView[],
	now = Date.now(),
	days = RECENT_WINDOW_DAYS
): number {
	const since = now - days * DAY;

	return releases.filter((release) => release.addedAt >= since).length;
}

/**
 * How the collection grew, month by month, up to and including this one.
 *
 * Every month in the span is in the list, including the ones nothing
 * arrived in: a line that skips its empty months draws a steady climb over
 * a year with a six-month gap in it.
 */
export function monthlyGrowth(
	releases: ReleaseView[],
	monthLabel: (at: Date) => string,
	now = Date.now(),
	months = GROWTH_MONTHS
): CountDatum[] {
	const current = startOfMonth(new Date(now));
	const counts = new Map<number, number>();

	for (let back = months - 1; back >= 0; back--) {
		const month = new Date(
			current.getFullYear(),
			current.getMonth() - back,
			1
		);

		counts.set(month.getTime(), 0);
	}

	const earliest = Math.min(...counts.keys());

	for (const release of releases) {
		if (release.addedAt < earliest) {
			continue;
		}

		const month = startOfMonth(new Date(release.addedAt)).getTime();
		const sofar = counts.get(month);

		if (sofar !== undefined) {
			counts.set(month, sofar + 1);
		}
	}

	return Array.from(counts.entries()).map(([month, count]) => ({
		label: monthLabel(new Date(month)),
		count,
	}));
}

/** The copies that arrived last, newest first. */
export function latestArrivals(
	releases: ReleaseView[],
	limit: number
): ReleaseView[] {
	return [...releases]
		.sort((a, b) => b.addedAt - a.addedAt)
		.slice(0, limit);
}

/** The bands with the most copies on the shelf. */
export function topArtists(
	releases: ReleaseView[],
	limit: number
): CountDatum[] {
	const counts = new Map<string, number>();

	for (const release of releases) {
		counts.set(
			release.artistName,
			(counts.get(release.artistName) ?? 0) + 1
		);
	}

	return Array.from(counts.entries())
		.sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
		.slice(0, limit)
		.map(([label, count]) => ({ label, count }));
}

/**
 * Copies per medium, biggest first, in the reader's own words.
 *
 * Media the collection has none of are left out rather than drawn as empty
 * bars: "no cassettes" is not a fact the chart is there to report.
 */
export function formatCounts(
	byFormat: Record<MediaFormat, number>,
	labelOf: (format: MediaFormat) => string
): CountDatum[] {
	return Object.entries(byFormat)
		.filter(([, count]) => count > 0)
		.map(([format, count]) => ({
			label: labelOf(format as MediaFormat),
			count,
		}))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** How many different values the collection holds of one field. */
export function distinctCount(
	releases: ReleaseView[],
	pick: (release: ReleaseView) => string | string[] | null
): number {
	const seen = new Set<string>();

	for (const release of releases) {
		const value = pick(release);

		for (const one of Array.isArray(value) ? value : [value]) {
			if (one) {
				seen.add(one);
			}
		}
	}

	return seen.size;
}
