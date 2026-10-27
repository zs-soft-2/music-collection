import { CountDatum } from '../count-stats';

/**
 * How many classes get a colour of their own. Past the sixth the palette has
 * no honest answer: a seventh hue would be one a colour-blind reader cannot
 * tell from one already on the ring, so the tail is summed into "other"
 * instead. Raising this number is not a palette question — it is a question
 * of whether the chart should still be a ring at all.
 */
export const DONUT_SLICE_LIMIT = 6;

/** The gap between two slices, in units of the 100-wide viewBox. */
const SLICE_GAP = 2;

/** Radius of the ring's centre line in the 100-wide viewBox. */
export const DONUT_RADIUS = 42;

const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

/** One class on the ring, drawn and listed. */
export interface DonutSlice {
	label: string;
	count: number;
	/** Percent of the whole, rounded for display. */
	share: number;
	/** `--mc-series-1`…`-6`, or `-other` for the summed tail. */
	color: string;
	/** `stroke-dasharray` of the arc. */
	dash: string;
	/** `stroke-dashoffset` of the arc. */
	offset: number;
}

/**
 * Turns counts into the arcs of a ring, largest first, with everything past
 * the sixth class summed into one "other" slice.
 *
 * The tail is deliberately placed last: it is the achromatic one, so it is
 * what separates the final hue from the first where the ring closes — the one
 * adjacency the palette's fixed order cannot speak for.
 *
 * Shares are rounded for reading and so need not total 100; the counts beside
 * them are what the reader can add up.
 */
export function toDonutSlices(
	data: CountDatum[],
	otherLabel: string,
	limit = DONUT_SLICE_LIMIT
): DonutSlice[] {
	const ranked = [...data]
		.filter((datum) => datum.count > 0)
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

	const total = ranked.reduce((sum, datum) => sum + datum.count, 0);

	if (!total) {
		return [];
	}

	const head = ranked.slice(0, limit);
	const tail = ranked.slice(limit);
	const tailCount = tail.reduce((sum, datum) => sum + datum.count, 0);

	const classes: { label: string; count: number; color: string }[] = [
		...head.map((datum, index) => ({
			label: datum.label,
			count: datum.count,
			color: `var(--mc-series-${index + 1})`,
		})),
		...(tailCount
			? [
					{
						label: otherLabel,
						count: tailCount,
						color: 'var(--mc-series-other)',
					},
				]
			: []),
	];

	let travelled = 0;

	return classes.map((entry) => {
		const arc = (entry.count / total) * CIRCUMFERENCE;
		/*
		 * A slice never eats its own gap entirely: a single copy of some
		 * format is a hairline, and a hairline the gap has swallowed looks
		 * like a class that is not there at all.
		 */
		const drawn = Math.max(arc - SLICE_GAP, 0.6);
		const slice: DonutSlice = {
			label: entry.label,
			count: entry.count,
			share: Math.round((entry.count / total) * 100),
			color: entry.color,
			dash: `${drawn} ${CIRCUMFERENCE - drawn}`,
			/* The first arc starts at zero, not at a negative zero. */
			offset: travelled ? -travelled : 0,
		};

		travelled += arc;

		return slice;
	});
}
