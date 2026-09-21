import { PerformanceLog } from './performance-log';

describe('PerformanceLog', () => {
	let clock: number;

	beforeEach(() => {
		clock = 0;
		jest.spyOn(performance, 'now').mockImplementation(() => clock);
		jest.spyOn(performance, 'measure').mockImplementation(
			() => ({}) as PerformanceMeasure
		);
	});

	afterEach(() => jest.restoreAllMocks());

	it('counts the whole run as blocking while it stays on the main thread', () => {
		const log = new PerformanceLog();
		const run = log.start('work');

		clock = 30;

		const sample = run.end();

		expect(sample.totalMs).toBe(30);
		expect(sample.blockingMs).toBe(30);
	});

	it('leaves the paused stretch out of the blocking time', () => {
		const log = new PerformanceLog();
		const run = log.start('work');

		clock = 2;
		run.pause();
		// The worker is doing the work: the wait goes on, the blocking stops.
		clock = 42;
		run.resume();
		clock = 45;

		const sample = run.end();

		expect(sample.totalMs).toBe(45);
		expect(sample.blockingMs).toBe(5);
	});

	it('keeps the details of the start and of the end', () => {
		const log = new PerformanceLog();
		const run = log.start('work', { nodes: 12 });

		const sample = run.end({ worker: true });

		expect(sample.detail).toEqual({ nodes: 12, worker: true });
	});

	it('sums the samples of a name into one row', () => {
		const log = new PerformanceLog();

		for (const duration of [10, 30]) {
			const run = log.start('work');

			clock += duration;
			run.end();
		}

		expect(log.stats()).toEqual([
			{
				name: 'work',
				runs: 2,
				blockingAvgMs: 20,
				blockingMaxMs: 30,
				blockingTotalMs: 40,
				totalAvgMs: 20,
				totalMaxMs: 30,
			},
		]);
	});

	it('lists the heaviest blocker first', () => {
		const log = new PerformanceLog();
		const light = log.start('light');

		clock = 5;
		light.end();

		const heavy = log.start('heavy');

		clock = 105;
		heavy.end();

		expect(log.stats().map((stat) => stat.name)).toEqual([
			'heavy',
			'light',
		]);
	});
});
