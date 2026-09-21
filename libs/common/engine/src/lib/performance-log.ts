/**
 * Timings of the work the app does, kept in memory so a run before a change
 * can be compared with a run after it.
 *
 * Two numbers are recorded for every run, and the difference between them is
 * the whole point. `totalMs` is how long the user waited for the result;
 * `blockingMs` is how much of that wait the main thread spent unable to
 * render, answer a click or run an animation. Moving work to a worker barely
 * changes the first and collapses the second.
 */

export type PerformanceDetail = Record<string, number | string | boolean>;

export interface PerformanceSample {
	name: string;
	/** Wall clock from the start of the work to its result. */
	totalMs: number;
	/** The part of it the main thread was busy with the work itself. */
	blockingMs: number;
	detail: PerformanceDetail;
	/** `performance.now()` of the start, to line samples up with a profile. */
	startedAt: number;
}

export interface PerformanceStat {
	name: string;
	runs: number;
	blockingAvgMs: number;
	blockingMaxMs: number;
	blockingTotalMs: number;
	totalAvgMs: number;
	totalMaxMs: number;
}

/** One measured run, from `PerformanceLog.start` to `end`. */
export interface PerformanceRun {
	/**
	 * The work left the main thread (it was handed to a worker): the wait
	 * goes on, the blocking does not.
	 */
	pause(): void;
	/** The work is back on the main thread. */
	resume(): void;
	end(detail?: PerformanceDetail): PerformanceSample;
}

/** How many samples are kept per name before the oldest are dropped. */
const SAMPLE_LIMIT = 200;

function now(): number {
	return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Marks the run in the browser profile too, where that is supported. */
function trace(sample: PerformanceSample): void {
	if (typeof performance === 'undefined' || !performance.measure) {
		return;
	}

	try {
		performance.measure(sample.name, {
			start: sample.startedAt,
			duration: sample.totalMs,
			detail: sample.detail,
		});
	} catch {
		// Older browsers only take mark names here; the sample is kept anyway.
	}
}

export class PerformanceLog {
	private readonly samples = new Map<string, PerformanceSample[]>();

	/** Starts measuring; the work is on the main thread until `pause`. */
	public start(name: string, detail: PerformanceDetail = {}): PerformanceRun {
		const startedAt = now();
		let blockingMs = 0;
		let blockingSince: number | null = startedAt;
		let ended = false;

		const stop = (at: number): void => {
			if (blockingSince !== null) {
				blockingMs += at - blockingSince;
				blockingSince = null;
			}
		};

		return {
			pause: (): void => stop(now()),
			resume: (): void => {
				if (blockingSince === null && !ended) {
					blockingSince = now();
				}
			},
			end: (extra: PerformanceDetail = {}): PerformanceSample => {
				// One clock reading for both numbers: work that never left
				// the main thread must come out blocking for its whole run.
				const endedAt = now();
				const totalMs = endedAt - startedAt;

				stop(endedAt);
				ended = true;

				const sample: PerformanceSample = {
					name,
					totalMs,
					blockingMs,
					detail: { ...detail, ...extra },
					startedAt,
				};

				this.record(sample);
				trace(sample);

				return sample;
			},
		};
	}

	/** Adds a sample measured elsewhere (a long task, a worker's own clock). */
	public record(sample: PerformanceSample): void {
		const kept = this.samples.get(sample.name) ?? [];

		kept.push(sample);

		if (kept.length > SAMPLE_LIMIT) {
			kept.splice(0, kept.length - SAMPLE_LIMIT);
		}
		this.samples.set(sample.name, kept);
	}

	public samplesOf(name: string): readonly PerformanceSample[] {
		return this.samples.get(name) ?? [];
	}

	public names(): string[] {
		return [...this.samples.keys()].sort();
	}

	/** One row per measured name, worst blocker first. */
	public stats(): PerformanceStat[] {
		return [...this.samples.values()]
			.filter((samples) => samples.length > 0)
			.map((samples) => ({
				name: samples[0].name,
				runs: samples.length,
				blockingAvgMs: round(average(samples, (s) => s.blockingMs)),
				blockingMaxMs: round(
					Math.max(...samples.map((s) => s.blockingMs))
				),
				blockingTotalMs: round(
					samples.reduce((sum, s) => sum + s.blockingMs, 0)
				),
				totalAvgMs: round(average(samples, (s) => s.totalMs)),
				totalMaxMs: round(Math.max(...samples.map((s) => s.totalMs))),
			}))
			.sort((a, b) => b.blockingTotalMs - a.blockingTotalMs);
	}

	public clear(): void {
		this.samples.clear();
	}
}

function average(
	samples: readonly PerformanceSample[],
	of: (sample: PerformanceSample) => number
): number {
	return (
		samples.reduce((sum, sample) => sum + of(sample), 0) / samples.length
	);
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * The log the app writes to. A plain module singleton on purpose: measuring
 * has to be a one-liner wherever the work happens, without an injector.
 */
export const performanceLog = new PerformanceLog();

/** Times one piece of synchronous work and returns what it returned. */
export function measure<T>(
	name: string,
	detail: PerformanceDetail,
	work: () => T
): T {
	const run = performanceLog.start(name, detail);

	try {
		return work();
	} finally {
		run.end();
	}
}
