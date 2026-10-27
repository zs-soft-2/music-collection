import { DocumentData, DocumentReference } from '@angular/fire/firestore';

import { toSyncBatches } from './firestore-sync.service';

const reference = (id: string) =>
	({ path: `collection/${id}` }) as unknown as DocumentReference;

const writes = (
	count: number
): { reference: DocumentReference; data: DocumentData }[] =>
	Array.from({ length: count }, (_unused, index) => ({
		reference: reference(`w${index}`),
		data: {} as DocumentData,
	}));

const deletions = (count: number): DocumentReference[] =>
	Array.from({ length: count }, (_unused, index) => reference(`d${index}`));

describe('toSyncBatches', () => {
	it('keeps a shelf-sized write in one batch', () => {
		expect(toSyncBatches(writes(400), [])).toHaveLength(1);
	});

	it('splits what Firestore would refuse', () => {
		// 1200 records filed at once: the collector who freezes a large
		// collection. One batch takes 500 operations, the feature stamp
		// included, so this is three.
		const rounds = toSyncBatches(writes(1200), []);

		expect(rounds).toHaveLength(3);
		expect(rounds.map((round) => round.writes.length)).toEqual([
			499, 499, 202,
		]);
	});

	it('counts a deletion as the two writes it is', () => {
		// A deletion writes its tombstone as well, so half as many fit.
		const rounds = toSyncBatches([], deletions(300));

		expect(rounds.map((round) => round.deletions.length)).toEqual([
			249, 51,
		]);
	});

	it('loses nothing on the way', () => {
		const rounds = toSyncBatches(writes(700), deletions(300));
		const written = rounds.flatMap((round) => round.writes);
		const removed = rounds.flatMap((round) => round.deletions);

		expect(written).toHaveLength(700);
		expect(removed).toHaveLength(300);
	});

	it('still stamps the feature when there is nothing to write', () => {
		expect(toSyncBatches([], [])).toEqual([{ writes: [], deletions: [] }]);
	});
});
