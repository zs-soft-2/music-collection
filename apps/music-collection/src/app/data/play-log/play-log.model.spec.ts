import {
	PlayLogEntry,
	listeningFor,
	summariseListening,
} from './play-log.model';

const HOUR_MS = 3_600_000;

const entry = (
	albumId: string,
	startedAt: number,
	overrides: Partial<PlayLogEntry> = {}
): PlayLogEntry => ({
	uid: `${albumId}-${startedAt}`,
	albumId,
	albumTitle: albumId.toUpperCase(),
	artistName: 'Artist',
	source: 'spotify',
	startedAt,
	endedAt: startedAt + HOUR_MS,
	playedMs: HOUR_MS,
	playedTracks: 10,
	trackCount: 10,
	completed: true,
	...overrides,
});

describe('listeningFor', () => {
	const log = [
		entry('a', 100),
		entry('a', 200, { completed: false }),
		entry('b', 300),
	];

	it('counts the sittings with one record', () => {
		expect(listeningFor(log, 'a')).toEqual({
			plays: 2,
			fullPlays: 1,
			lastPlayedAt: 200,
		});
	});

	it('says nothing about a record never put on', () => {
		expect(listeningFor(log, 'c')).toEqual({
			plays: 0,
			fullPlays: 0,
			lastPlayedAt: null,
		});
		expect(listeningFor(log, null).plays).toBe(0);
	});
});

describe('summariseListening', () => {
	const now = new Date(2026, 5, 1).getTime();
	const lastYear = new Date(2025, 5, 1).getTime();
	const thisYear = new Date(2026, 1, 1).getTime();

	it('adds the log up', () => {
		const summary = summariseListening(
			[
				entry('a', lastYear),
				entry('a', thisYear),
				entry('b', thisYear, {
					completed: false,
					playedMs: HOUR_MS / 2,
				}),
			],
			now
		);

		expect(summary.plays).toBe(3);
		expect(summary.fullPlays).toBe(2);
		expect(summary.records).toBe(2);
		expect(summary.playsThisYear).toBe(2);
		expect(summary.hours).toBe(2.5);
	});

	it('ranks the records by how often they went on', () => {
		const summary = summariseListening(
			[entry('a', 100), entry('b', 200), entry('b', 300)],
			now
		);

		expect(summary.top.map((record) => record.albumId)).toEqual(['b', 'a']);
		expect(summary.top[0].plays).toBe(2);
	});

	it('names a record as the last sitting called it', () => {
		const summary = summariseListening(
			[
				entry('a', 100, { albumTitle: 'Old name' }),
				entry('a', 200, { albumTitle: 'New name' }),
			],
			now
		);

		expect(summary.top[0].albumTitle).toBe('New name');
	});

	it('has nothing to say about an empty log', () => {
		const summary = summariseListening([], now);

		expect(summary).toEqual({
			plays: 0,
			fullPlays: 0,
			records: 0,
			playsThisYear: 0,
			hours: 0,
			top: [],
		});
	});
});
