/** One line of time-synced lyrics. */
export interface LyricLine {
	timeMs: number;
	text: string;
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;
const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\]/im;

/**
 * Parses LRC (`[01:23.45] line`) into lines in time order. A line may carry
 * several time tags; the `[offset:±ms]` tag is applied.
 */
export function parseLrc(lrc: string | null | undefined): LyricLine[] {
	if (!lrc) {
		return [];
	}
	const offset = Number(OFFSET_TAG.exec(lrc)?.[1] ?? 0);
	const lines: LyricLine[] = [];

	for (const raw of lrc.split(/\r?\n/)) {
		const times = [...raw.matchAll(TIME_TAG)];
		if (!times.length) {
			continue;
		}
		const text = raw.replace(TIME_TAG, '').trim();
		for (const [, minutes, seconds] of times) {
			const timeMs =
				(Number(minutes) * 60 + Number(seconds.replace(':', '.'))) *
					1000 -
				offset;
			lines.push({ timeMs: Math.max(0, timeMs), text });
		}
	}
	return lines.sort((a, b) => a.timeMs - b.timeMs);
}

/** Index of the line sung at the position, -1 before the first one. */
export function activeLineIndex(
	lines: LyricLine[],
	positionMs: number
): number {
	let low = 0;
	let high = lines.length - 1;
	let found = -1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		if (lines[middle].timeMs <= positionMs) {
			found = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	return found;
}

/** 83_400 → "1:23". */
export function formatTime(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
