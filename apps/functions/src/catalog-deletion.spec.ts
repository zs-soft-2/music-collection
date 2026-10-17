import { Firestore } from 'firebase-admin/firestore';

import { deleteAlbum, deleteRelease } from './catalog-deletion';

// ── Firestore-utánzat lekérdezésekkel ──────────────────────────────────────
//
// A törlésnél nem az adat a kérdés, hanem az, hogy MI TÖRTÉNT: mit olvasott
// meg a tranzakció, mielőtt döntött, és mit törölt utána. Ezért a hamis
// adatbázis dokumentumokat tart útvonal szerint, a lekérdezést pedig a
// gyűjtemény nevére és egy mezőegyezésre szűkíti — pont annyira, amennyit
// ez a modul használ.

interface Document {
	path: string;
	data: Record<string, unknown>;
}

interface Deletion {
	path: string;
}

interface Write {
	path: string;
	data: Record<string, unknown>;
}

/** A tárolt dokumentumok: a `reference` ebből olvas, ha lekérik. */
let stored: Document[] = [];

const reference = (path: string): any => {
	const parts = path.split('/');

	return {
		path,
		id: parts[parts.length - 1],
		parent: { id: parts[parts.length - 2] },
		collection: (name: string) => collectionAt(`${path}/${name}`),
		run() {
			const document = stored.find((held) => held.path === path);

			return {
				exists: !!document,
				ref: reference(path),
				get: (field: string) =>
					document ? valueAt(document.data, field) : undefined,
			};
		},
	};
};

const collectionAt = (path: string): any => ({
	doc: (id: string) => reference(`${path}/${id}`),
});

/** A gyűjtemény neve az útvonal utolsó előtti eleme. */
const collectionOf = (path: string): string => {
	const parts = path.split('/');

	return parts[parts.length - 2] ?? '';
};

const valueAt = (data: Record<string, unknown>, field: string): unknown =>
	field
		.split('.')
		.reduce<unknown>(
			(held, key) =>
				held && typeof held === 'object'
					? (held as Record<string, unknown>)[key]
					: undefined,
			data
		);

const matches = (held: unknown, operation: string, value: unknown) => {
	switch (operation) {
		case 'in':
			return (value as unknown[]).includes(held);
		case 'array-contains':
			return Array.isArray(held) && held.includes(value);
		default:
			return held === value;
	}
};

function fakeDatabase(documents: Document[]) {
	const deletions: Deletion[] = [];
	const writes: Write[] = [];
	const updates: Write[] = [];

	stored = documents;

	const buildQuery = (collectionId: string, group: boolean): any => {
		const filters: { field: string; operation: string; value: unknown }[] =
			[];
		let cap = Infinity;

		const self: any = {
			where(field: string, operation: string, value: unknown) {
				filters.push({ field, operation, value });

				return self;
			},
			limit(count: number) {
				cap = count;

				return self;
			},
			run() {
				const matched = documents
					.filter((document) =>
						group
							? collectionOf(document.path) === collectionId
							: document.path.startsWith(`${collectionId}/`) &&
								document.path.split('/').length === 2
					)
					.filter((document) =>
						filters.every((filter) =>
							matches(
								valueAt(document.data, filter.field),
								filter.operation,
								filter.value
							)
						)
					)
					.slice(0, cap);

				return {
					empty: matched.length === 0,
					size: matched.length,
					docs: matched.map((document) => ({
						ref: reference(document.path),
						get: (field: string) => valueAt(document.data, field),
					})),
				};
			},
		};

		return self;
	};

	const transaction = {
		get: async (query: any) => query.run(),
		delete: ({ path }: { path: string }) => deletions.push({ path }),
		set: ({ path }: { path: string }, data: Record<string, unknown>) =>
			writes.push({ path, data }),
		update: ({ path }: { path: string }, data: Record<string, unknown>) =>
			updates.push({ path, data }),
	};

	const database = {
		collection: (name: string) => ({
			...collectionAt(name),
			...buildQuery(name, false),
		}),
		collectionGroup: (name: string) => buildQuery(name, true),
		doc: (path: string) => reference(path),
		runTransaction: <T>(work: (held: typeof transaction) => Promise<T>) =>
			work(transaction),
	};

	return {
		database: database as unknown as Firestore,
		deletions,
		writes,
		updates,
	};
}

const RELEASE_PATH = 'artist/a1/album/al1/release/r1';

const catalog = (): Document[] => [
	{
		path: RELEASE_PATH,
		data: {
			uid: 'r1',
			name: 'Master of Puppets — 1986 EU',
			album: { uid: 'al1' },
			artist: { uid: 'a1' },
		},
	},
	{
		path: 'track/r1_001',
		data: { uid: 'r1_001', releaseUid: 'r1', albumUid: 'al1' },
	},
	{
		path: 'track/al1_001',
		data: { uid: 'al1_001', albumUid: 'al1' },
	},
];

const copy = (path = 'user/collector-1/collection-item/c1'): Document => ({
	path,
	data: { uid: 'c1', userId: 'collector-1', release: { uid: 'r1' } },
});

describe('deleteRelease', () => {
	it('törli a kiadást és a saját számait, ha senkinek nincs példánya', async () => {
		const { database, deletions, writes } = fakeDatabase(catalog());

		const result = await deleteRelease(database, 'r1');

		expect(result).toEqual({
			uid: 'r1',
			deletedTracks: 1,
			releasedSerials: 0,
		});
		expect(deletions.map((deletion) => deletion.path)).toEqual([
			RELEASE_PATH,
			'track/r1_001',
		]);
	});

	it('nem viszi el az album számát, csak a kiadásét', async () => {
		const { database, deletions } = fakeDatabase(catalog());

		await deleteRelease(database, 'r1');

		expect(
			deletions.some((deletion) => deletion.path === 'track/al1_001')
		).toBe(false);
	});

	it('markert hagy, hogy a kliens cache-éből is kiessen', async () => {
		const { database, writes } = fakeDatabase(catalog());

		await deleteRelease(database, 'r1');

		expect(writes.map((write) => write.path)).toContain(
			`sync/release/deletion/${RELEASE_PATH.split('/').join('~')}`
		);
		expect(writes.map((write) => write.path)).toContain(
			'sync/track/deletion/track~r1_001'
		);
		expect(writes.map((write) => write.path)).toContain('sync/catalog');
	});

	it('lépteti a darabszámot', async () => {
		const { database, writes } = fakeDatabase(catalog());

		await deleteRelease(database, 'r1');

		const quantity = writes.find(
			(write) => write.path === 'entity-quantity/Release'
		);

		expect(quantity?.data).toMatchObject({ type: 'Release' });
		expect(quantity?.data['group']).toBeDefined();
	});

	it('elutasítja, ha bárkinek van példánya a kiadásból', async () => {
		const { database, deletions } = fakeDatabase([...catalog(), copy()]);

		await expect(deleteRelease(database, 'r1')).rejects.toThrow(/példány/);
		expect(deletions).toEqual([]);
	});

	it('akkor is elutasítja, ha a példány másik gyűjtőé', async () => {
		const { database } = fakeDatabase([
			...catalog(),
			copy('user/collector-2/collection-item/c9'),
		]);

		await expect(deleteRelease(database, 'r1')).rejects.toThrow(/példány/);
	});

	it('nem talál kiadást ismeretlen uid-re', async () => {
		const { database } = fakeDatabase(catalog());

		await expect(deleteRelease(database, 'r404')).rejects.toThrow(
			/Nincs ilyen kiadás/
		);
	});

	it('hiányzó uid-et nem fogad el', async () => {
		const { database } = fakeDatabase(catalog());

		await expect(deleteRelease(database, '  ')).rejects.toThrow(
			/Hiányzó uid/
		);
	});
});

// ── Album ──────────────────────────────────────────────────────────────────

const ALBUM_PATH = 'artist/a1/album/al1';

const albumCatalog = (): Document[] => [
	{
		path: ALBUM_PATH,
		data: { uid: 'al1', name: 'Scream Bloody Gore', artist: { uid: 'a1' } },
	},
	...catalog(),
	{
		path: 'contribution/co1',
		data: { uid: 'co1', albumUid: 'al1' },
	},
	{
		path: 'membership/m1',
		data: { uid: 'm1', albumUids: ['al1', 'al2'], albumCount: 2 },
	},
	{
		path: 'copy-serial/r1_7',
		data: { releaseId: 'r1', number: 7, userId: 'collector-1' },
	},
];

describe('deleteAlbum', () => {
	it('mindent visz, ami alatta van, ha senkinek nincs példánya', async () => {
		const { database, deletions, updates } = fakeDatabase(albumCatalog());

		const result = await deleteAlbum(database, 'al1', 'a1', 'admin');

		expect(result).toEqual({
			uid: 'al1',
			deletedReleases: 1,
			deletedTracks: 2,
			deletedCopies: 0,
			deletedRatings: 0,
		});
		expect(deletions.map((deletion) => deletion.path).sort()).toEqual(
			[
				ALBUM_PATH,
				RELEASE_PATH,
				'track/al1_001',
				'track/r1_001',
				'contribution/co1',
				'copy-serial/r1_7',
			].sort()
		);
		expect(updates.map((update) => update.path)).toEqual(['membership/m1']);
		expect(updates[0].data['albumCount']).toBe(1);
	});

	it('a hívó saját példányát és értékelését is viszi', async () => {
		const { database, deletions } = fakeDatabase([
			...albumCatalog(),
			copy('user/collector-1/collection-item/c1'),
			{
				path: 'user/collector-1/rating/al1',
				data: { albumId: 'al1', stars: 2 },
			},
		]);

		const result = await deleteAlbum(database, 'al1', 'a1', 'collector-1');

		expect(result.deletedCopies).toBe(1);
		expect(result.deletedRatings).toBe(1);
		expect(deletions.map((deletion) => deletion.path)).toEqual(
			expect.arrayContaining([
				'user/collector-1/collection-item/c1',
				'user/collector-1/rating/al1',
			])
		);
	});

	it('elutasítja, ha más gyűjtőnek van példánya', async () => {
		const { database, deletions } = fakeDatabase([
			...albumCatalog(),
			copy('user/collector-2/collection-item/c9'),
		]);

		await expect(
			deleteAlbum(database, 'al1', 'a1', 'collector-1')
		).rejects.toThrow(/más gyűjtő/);
		expect(deletions).toEqual([]);
	});

	it('elutasítja, ha más gyűjtő értékelte', async () => {
		const { database } = fakeDatabase([
			...albumCatalog(),
			{
				path: 'user/collector-2/rating/al1',
				data: { albumId: 'al1', stars: 5 },
			},
		]);

		await expect(
			deleteAlbum(database, 'al1', 'a1', 'collector-1')
		).rejects.toThrow(/értékelte/);
	});

	it('lépteti az album és a kiadás darabszámát', async () => {
		const { database, writes } = fakeDatabase(albumCatalog());

		await deleteAlbum(database, 'al1', 'a1', 'admin');

		const paths = writes.map((write) => write.path);

		expect(paths).toContain('entity-quantity/Album');
		expect(paths).toContain('entity-quantity/Release');
		expect(paths).toContain(
			`sync/album/deletion/${ALBUM_PATH.split('/').join('~')}`
		);
	});

	it('nem talál albumot ismeretlen uid-re', async () => {
		const { database } = fakeDatabase(albumCatalog());

		await expect(
			deleteAlbum(database, 'al404', 'a1', 'admin')
		).rejects.toThrow(/Nincs ilyen album/);
	});
});
