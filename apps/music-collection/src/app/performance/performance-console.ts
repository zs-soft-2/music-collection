import {
	PerformanceSample,
	PerformanceStat,
	performanceLog,
} from '@music-collection/common/engine';

import { environment } from '../../environments/environment';
import { areWorkersEnabled, setWorkersEnabled } from '../worker';

/**
 * The console handle of the performance log: `__mcPerf` in the browser's
 * developer tools.
 *
 * Measuring a change usually goes: use the page, `__mcPerf.report()`,
 * `__mcPerf.workers(false)` to put the work back on the main thread, use the
 * page the same way, then `__mcPerf.compare('network.layout')` for the two
 * rows side by side.
 */
export interface PerformanceConsole {
	/** Every measured name, worst blocker first. */
	report(): PerformanceStat[];
	/** One name split by where it ran, so the two can be read off. */
	compare(name: string): PerformanceStat[];
	/** The frames the browser could not deliver, worst first, with names. */
	blockers(): readonly PerformanceSample[];
	samples(name: string): readonly PerformanceSample[];
	/** Reads, or switches, whether the workers are used at all. */
	workers(enabled?: boolean): boolean;
	reset(): void;
}

/** The main thread was busy this long in one go; 50ms is the usual mark. */
const LONG_TASK = 'long-task';
/** A frame the browser could not deliver on time, with what held it up. */
const LONG_FRAME = 'long-frame';

/**
 * A script inside a long animation frame, as the browser reports it. Not in
 * the DOM typings yet, so it is spelled out here.
 */
interface LongFrameScript {
	duration: number;
	invoker?: string;
	invokerType?: string;
	sourceURL?: string;
	sourceFunctionName?: string;
}

interface LongFrameEntry extends PerformanceEntry {
	blockingDuration?: number;
	scripts?: LongFrameScript[];
}

/** The file and function a script came from, short enough to read in a row. */
function scriptLabel(script: LongFrameScript): string {
	const file = (script.sourceURL ?? '').split('/').pop() ?? '';
	const where = script.sourceFunctionName || script.invoker || 'anonymous';

	return file ? `${where} (${file})` : where;
}

function table(rows: object[]): void {
	if (rows.length) {
		console.table(rows);
	} else {
		console.info('No samples recorded yet.');
	}
}

function statOf(
	name: string,
	samples: readonly PerformanceSample[]
): PerformanceStat | null {
	if (!samples.length) {
		return null;
	}
	const blocking = samples.map((sample) => sample.blockingMs);
	const total = samples.map((sample) => sample.totalMs);
	const round = (value: number): number => Math.round(value * 100) / 100;
	const sum = (values: number[]): number =>
		values.reduce((all, value) => all + value, 0);

	return {
		name,
		runs: samples.length,
		blockingAvgMs: round(sum(blocking) / samples.length),
		blockingMaxMs: round(Math.max(...blocking)),
		blockingTotalMs: round(sum(blocking)),
		totalAvgMs: round(sum(total) / samples.length),
		totalMaxMs: round(Math.max(...total)),
	};
}

/**
 * Whatever blocked the main thread for long enough that the browser calls it
 * a long task — the honest, outside view of the same story, and the one that
 * also catches work nobody thought to measure.
 */
function observeLongTasks(): void {
	observe('longtask', (entry) =>
		performanceLog.record({
			name: LONG_TASK,
			totalMs: entry.duration,
			blockingMs: entry.duration,
			detail: { source: entry.name },
			startedAt: entry.startTime,
		})
	);

	// The same frames, but Chrome names the script that held them up, which
	// turns "something blocked for 147ms" into a function and a file.
	observe('long-animation-frame', (entry) => {
		const frame = entry as LongFrameEntry;
		const worst = [...(frame.scripts ?? [])].sort(
			(a, b) => b.duration - a.duration
		)[0];

		performanceLog.record({
			name: LONG_FRAME,
			totalMs: frame.duration,
			blockingMs: frame.blockingDuration ?? frame.duration,
			detail: worst
				? {
						culprit: scriptLabel(worst),
						culpritMs: Math.round(worst.duration),
						invokerType: worst.invokerType ?? '',
						scripts: frame.scripts?.length ?? 0,
					}
				: { culprit: 'not attributed', scripts: 0 },
			startedAt: frame.startTime,
		});
	});
}

/** Subscribes to one kind of entry, where the browser reports it at all. */
function observe(
	type: string,
	onEntry: (entry: PerformanceEntry) => void
): void {
	if (typeof PerformanceObserver === 'undefined') {
		return;
	}

	try {
		new PerformanceObserver((list) =>
			list.getEntries().forEach(onEntry)
		).observe({ type, buffered: true });
	} catch {
		// Not every browser reports these; the rest still works.
	}
}

/** How long after load the first report waits for the page to settle. */
const SETTLE_MS = 3000;

/**
 * Prints the first load's numbers by itself, once, outside production. The
 * report is only useful if somebody looks at it, and a reload is a lower bar
 * than remembering a console command.
 */
function reportWhenSettled(handle: PerformanceConsole): void {
	if (environment.production || typeof window === 'undefined') {
		return;
	}

	const print = (): void => {
		window.setTimeout(() => {
			console.groupCollapsed(
				'__mcPerf — what the first load cost (reload to measure again)'
			);
			handle.blockers();
			handle.report();
			console.info(
				'__mcPerf.workers(false) then reload puts the worker`s work back on the main thread; __mcPerf.compare("network.layout") shows the two side by side.'
			);
			console.groupEnd();
		}, SETTLE_MS);
	};

	if (document.readyState === 'complete') {
		print();
	} else {
		window.addEventListener('load', print, { once: true });
	}
}

export function installPerformanceConsole(): void {
	observeLongTasks();

	const handle: PerformanceConsole = {
		report: () => {
			const stats = performanceLog.stats();

			table(stats);

			return stats;
		},
		compare: (name) => {
			const samples = performanceLog.samplesOf(name);
			const stats = [
				statOf(
					`${name} (worker)`,
					samples.filter((sample) => sample.detail['worker'] === true)
				),
				statOf(
					`${name} (main thread)`,
					samples.filter((sample) => sample.detail['worker'] !== true)
				),
			].filter((stat): stat is PerformanceStat => !!stat);

			table(stats);

			return stats;
		},
		samples: (name) => performanceLog.samplesOf(name),
		blockers: () => {
			const frames = [...performanceLog.samplesOf(LONG_FRAME)].sort(
				(a, b) => b.blockingMs - a.blockingMs
			);

			table(
				frames.map((frame) => ({
					blockingMs: Math.round(frame.blockingMs),
					frameMs: Math.round(frame.totalMs),
					culprit: frame.detail['culprit'],
					culpritMs: frame.detail['culpritMs'],
					invokerType: frame.detail['invokerType'],
				}))
			);

			return frames;
		},
		workers: (enabled) => {
			if (enabled !== undefined) {
				setWorkersEnabled(enabled);
			}
			return areWorkersEnabled();
		},
		reset: () => performanceLog.clear(),
	};

	(globalThis as unknown as { __mcPerf: PerformanceConsole }).__mcPerf =
		handle;

	reportWhenSettled(handle);
}
