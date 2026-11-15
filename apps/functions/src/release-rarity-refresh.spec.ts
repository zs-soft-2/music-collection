import { Firestore } from 'firebase-admin/firestore';

import { Fetch } from './discogs-api';
import {
	RarityError,
	readHave,
	refreshRaritySlice,
	refreshRelease,
	setRarityOverride,
} from './release-rarity-refresh';

const NOW = Date.UTC(2026, 10, 14);

/** A Discogs válasza egy kiadásra — árral együtt, ahogy a valódi adja. */
const discogs = (have: number, status = 200): Fetch =>
	jest.fn(async () => ({
		ok: status === 200,
		status,
		json: async () => ({
			community: { have, want: 900 },
			lowest_price: 120.5,
			num_for_sale: 7,
		}),
	}));

interface FakeDocument {
	path: string;
	data: Record<string, unknown>;
}

/** Annyi Firestore, amennyit a modul használ. */
function fakeDatabase(documents: FakeDocument[]) {
	const writes: { path: string; data: Record<string, unknown> }[] = [];
	const state: { cursor?: string | null } = {};
	const reference = (document: FakeDocument) => ({
		path: document.path,
		get: async () => ({ data: () => document.data }),
	});
	// A kurzor a korlát előtt érvényesül, akármilyen sorrendben kérik —
	// ahogy a Firestore-ban is.
	const query = (
		rows: FakeDocument[],
		after: string | null = null,
		count = Infinity
	) => ({
		where: (_field: string, _op: string, uid: string) =>
			query(
				rows.filter((row) => row.data['uid'] === uid),
				after,
				count
			),
		orderBy: () =>
			query(
				[...rows].sort((a, b) => a.path.localeCompare(b.path)),
				after,
				count
			),
		limit: (limit: number) => query(rows, after, limit),
		startAfter: (cursor: string) => query(rows, cursor, count),
		get: async () => {
			const found = rows
				.filter((row) => after === null || row.path > after)
				.slice(0, count);

			return {
				empty: !found.length,
				docs: found.map((row) => ({ ref: reference(row) })),
			};
		},
	});
	const database = {
		collectionGroup: () => query(documents),
		collection: () => ({ doc: () => ({ path: 'sync/catalog' }) }),
		doc: () => ({
			get: async () => ({ get: () => state.cursor ?? undefined }),
			set: async (data: { cursor: string | null }) => {
				state.cursor = data.cursor;
			},
		}),
		runTransaction: async (work: (transaction: unknown) => Promise<void>) =>
			work({
				update: (
					target: { path: string },
					data: Record<string, unknown>
				) => {
					writes.push({ path: target.path, data });
					Object.assign(
						documents.find((row) => row.path === target.path)
							?.data ?? {},
						data
					);
				},
				set: () => undefined,
			}),
	};

	return {
		database: database as unknown as Firestore,
		reference,
		writes,
		state,
	};
}

const pressing = (
	uid: string,
	data: Record<string, unknown> = {}
): FakeDocument => ({
	path: `artist/a/album/b/release/${uid}`,
	data: {
		uid,
		discogsReleaseId: 1234,
		date: Date.UTC(1988, 4, 5),
		album: { year: 1988 },
		formatDescription: ['reissue'],
		...data,
	},
});

describe('readHave', () => {
	it('a kiadás „have" számát adja', async () => {
		const fetchImpl = discogs(214);

		expect(await readHave(1234, { fetchImpl })).toBe(214);
		expect(fetchImpl).toHaveBeenCalledWith(
			'https://api.discogs.com/releases/1234',
			expect.anything()
		);
	});

	it('amit a Discogs nem ismer, arról nem mond számot', async () => {
		expect(await readHave(1234, { fetchImpl: discogs(0, 404) })).toBeNull();
	});

	it('a többi hibát nem nyeli le', async () => {
		await expect(
			readHave(1234, { fetchImpl: discogs(0, 500) })
		).rejects.toThrow(/Discogs 500/);
	});
});

describe('refreshRelease', () => {
	it('beírja a szintet, és csak a „have" megy tovább a válaszból', async () => {
		const document = pressing('one');
		const { database, reference, writes } = fakeDatabase([document]);
		const refreshed = await refreshRelease(
			database,
			reference(document) as never,
			{
				fetchImpl: discogs(214),
				now: () => NOW,
			}
		);

		expect(refreshed).toMatchObject({ changed: true, asked: true });
		expect(writes).toHaveLength(1);
		expect(writes[0].data['rarity']).toEqual({
			tier: 'rare',
			source: 'discogs',
			have: 214,
			calculatedAt: NOW,
		});
		// Ár és piactér-adat sehol nincs abban, amit írtunk.
		expect(JSON.stringify(writes)).not.toMatch(/price|for_sale|want/);
	});

	it('nem ír, ha a szint és a forrása nem változott', async () => {
		const document = pressing('one', {
			rarity: { tier: 'rare', source: 'discogs', have: 200 },
		});
		const { database, reference, writes } = fakeDatabase([document]);
		const refreshed = await refreshRelease(
			database,
			reference(document) as never,
			{
				fetchImpl: discogs(214),
				now: () => NOW,
			}
		);

		expect(refreshed?.changed).toBe(false);
		expect(writes).toEqual([]);
	});

	it('Discogs-azonosító nélkül nem kérdez, a címkékből számol', async () => {
		const document = pressing('one', {
			discogsReleaseId: null,
			formatDescription: ['limited edition'],
		});
		const { database, reference, writes } = fakeDatabase([document]);
		const fetchImpl = discogs(3);
		const refreshed = await refreshRelease(
			database,
			reference(document) as never,
			{
				fetchImpl,
				now: () => NOW,
			}
		);

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(refreshed).toMatchObject({ asked: false });
		expect(writes[0].data['rarity']).toMatchObject({
			tier: 'rare',
			source: 'catalog',
		});
	});

	it('általános példányra és felülbírált kiadásra sem kérdezi a Discogsot', async () => {
		const fetchImpl = discogs(3);

		for (const data of [
			{ generic: true },
			{ rarityOverride: { tier: 'veryRare', note: 'tesztnyomás' } },
		]) {
			const document = pressing('one', data);
			const { database, reference } = fakeDatabase([document]);

			await refreshRelease(database, reference(document) as never, {
				fetchImpl,
				now: () => NOW,
			});
		}

		expect(fetchImpl).not.toHaveBeenCalled();
	});
});

describe('setRarityOverride', () => {
	it('beírja a kurátor szintjét, és a szint azt követi', async () => {
		const document = pressing('one');
		const { database, writes } = fakeDatabase([document]);
		const result = await setRarityOverride(
			database,
			{ uid: 'one', tier: 'veryRare', note: 'Tesztnyomás, 50 darab.' },
			'curator',
			{ fetchImpl: discogs(5000), now: () => NOW }
		);

		expect(writes[0].data['rarityOverride']).toEqual({
			tier: 'veryRare',
			note: 'Tesztnyomás, 50 darab.',
			byUserId: 'curator',
			at: NOW,
		});
		expect(result.rarity).toMatchObject({
			tier: 'veryRare',
			source: 'manual',
		});
	});

	it('a visszavonás után megint a források döntenek', async () => {
		const document = pressing('one', {
			rarityOverride: { tier: 'veryRare', note: 'x' },
			rarity: { tier: 'veryRare', source: 'manual' },
		});
		const { database } = fakeDatabase([document]);
		const result = await setRarityOverride(
			database,
			{ uid: 'one', tier: null },
			'curator',
			{ fetchImpl: discogs(5000), now: () => NOW }
		);

		expect(result.rarity).toMatchObject({
			tier: 'common',
			source: 'discogs',
		});
	});

	it('indoklás nélkül, ismeretlen szinttel és ismeretlen kiadásra nem ír', async () => {
		const { database, writes } = fakeDatabase([pressing('one')]);
		const attempt = (data: Record<string, unknown>) =>
			setRarityOverride(database, data, 'curator');

		await expect(attempt({ uid: 'one', tier: 'rare' })).rejects.toThrow(
			/indoklás/
		);
		await expect(
			attempt({ uid: 'one', tier: 'legendary', note: 'x' })
		).rejects.toThrow(/szint/);
		await expect(
			attempt({ uid: 'nincs', tier: 'rare', note: 'x' })
		).rejects.toMatchObject({ code: 'not-found' });
		await expect(
			attempt({ tier: 'rare', note: 'x' })
		).rejects.toBeInstanceOf(RarityError);
		expect(writes).toEqual([]);
	});
});

describe('refreshRaritySlice', () => {
	const sleep = jest.fn(async () => undefined);

	it('szeletenként megy végig, és megjegyzi, hol tart', async () => {
		const { database, state } = fakeDatabase([
			pressing('a'),
			pressing('b'),
			pressing('c'),
		]);
		const options = { fetchImpl: discogs(214), now: () => NOW, sleep };
		const first = await refreshRaritySlice(
			database,
			{ budgetMs: 60_000, limit: 2 },
			options
		);

		expect(first).toMatchObject({
			processed: 2,
			changed: 2,
			wrapped: false,
		});
		expect(state.cursor).toBe('artist/a/album/b/release/b');

		const second = await refreshRaritySlice(
			database,
			{ budgetMs: 60_000, limit: 2 },
			options
		);

		// A végére ért: a következő futás elölről kezdi.
		expect(second).toMatchObject({ processed: 1, wrapped: true });
		expect(state.cursor).toBeNull();
	});

	it('megáll, ha a Discogs megálljt mond, és onnan folytatja', async () => {
		const { database, state } = fakeDatabase([
			pressing('a'),
			pressing('b'),
		]);
		const result = await refreshRaritySlice(
			database,
			{ budgetMs: 60_000 },
			{ fetchImpl: discogs(0, 429), now: () => NOW, sleep }
		);

		expect(result).toMatchObject({
			processed: 0,
			throttled: true,
			wrapped: false,
		});
		expect(state.cursor).toBeNull();
	});
});
