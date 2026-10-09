import { Firestore } from 'firebase-admin/firestore';

import { adoptBadgeImage } from './badge-generation';

// ── Storage-utánzat ───────────────────────────────────────────────────────
//
// A beiktatásnál a fájl a tanú: a szerver nem hisz a kliens címének, hanem
// visszaolvassa az objektumot. A hamis bucket ezért útvonal szerint tart
// fájlokat, és számon tartja, kapott-e valamelyik letöltési tokent.

interface StoredFile {
	contentType: string;
	size: number;
	tokens?: string;
}

const mockFiles: Record<string, StoredFile> = {};

// A `firebase-functions` az Auth SDK-t is behúzza, azon át egy ESM-only
// csomagot, amit a jest CommonJS-futtatója nem tölt be. A naplóból és a
// hibából itt egy utánzat is elég — a kód a hiba üzenetét hordozza.
jest.mock('firebase-functions/v2', () => ({
	logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/v2/https', () => ({
	HttpsError: class HttpsError extends Error {
		constructor(
			public readonly code: string,
			message: string
		) {
			super(message);
		}
	},
}));

jest.mock('firebase-admin/storage', () => ({
	getStorage: () => ({
		bucket: () => ({
			name: 'music-collection.appspot.com',
			file: (path: string) => ({
				exists: async () => [!!mockFiles[path]],
				getMetadata: async () => [
					{
						contentType: mockFiles[path]?.contentType,
						size: mockFiles[path]?.size,
						metadata: mockFiles[path]?.tokens
							? {
									firebaseStorageDownloadTokens:
										mockFiles[path].tokens,
								}
							: {},
					},
				],
				setMetadata: async (metadata: {
					metadata: { firebaseStorageDownloadTokens: string };
				}) => {
					mockFiles[path].tokens =
						metadata.metadata.firebaseStorageDownloadTokens;
				},
			}),
		}),
	}),
}));

// ── Firestore-utánzat tranzakcióval ───────────────────────────────────────
//
// Az új dokumentum azonosítóját az adatbázis adja (`doc()` argumentum
// nélkül), ezért a hamis adatbázis is oszt ilyet — enélkül nem látszana,
// hogy a galéria-bejegyzés és a dokumentum ugyanarra mutat.

function fakeDatabase(documents: Record<string, Record<string, unknown>>) {
	let next = 0;
	const reference = (path: string): any => ({
		path,
		id: path.split('/').pop(),
	});
	const snapshot = (path: string) => ({
		exists: !!documents[path],
		data: () => documents[path],
		get: (field: string) => documents[path]?.[field],
	});
	const database = {
		collection: (name: string) => ({
			doc: (id?: string) => {
				const held = reference(`${name}/${id ?? `new-${++next}`}`);

				return { ...held, get: async () => snapshot(held.path) };
			},
		}),
		runTransaction: async <T>(
			body: (transaction: any) => Promise<T>
		): Promise<T> =>
			body({
				get: async (held: { path: string }) => snapshot(held.path),
				set: (
					held: { path: string },
					data: Record<string, unknown>
				) => {
					documents[held.path] = {
						...(documents[held.path] ?? {}),
						...data,
					};
				},
			}),
	} as unknown as Firestore;

	return { database, documents };
}

const UPLOADED = 'document/the-wave-pin-1760000000000.png';
const NOW = Date.UTC(2026, 9, 9, 10, 0);

beforeEach(() => {
	Object.keys(mockFiles).forEach((path) => delete mockFiles[path]);
	mockFiles[UPLOADED] = { contentType: 'image/png', size: 120_000 };
});

describe('adoptBadgeImage', () => {
	it('dokumentumot ad a feltöltött kép fölé, és jelvénnyé teszi', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave', slug: 'the-wave' },
		});

		const adopted = await adoptBadgeImage(
			store.database,
			'wave',
			UPLOADED,
			'sajat-pin.png',
			NOW
		);

		expect(adopted.source).toBe('uploaded');
		expect(adopted.filePath).toContain(encodeURIComponent(UPLOADED));

		const badge = store.documents['music-collection/wave'][
			'badge'
		] as Record<string, unknown>;

		expect(badge['image']).toEqual(adopted);
		expect(badge['gallery']).toEqual([adopted]);
		expect(
			store.documents[`document/${adopted.documentUid}`]
		).toMatchObject({
			category: 'badge',
			fileType: 'image/png',
			originalName: 'sajat-pin.png',
			filePath: adopted.filePath,
		});
	});

	it('a rajzolt jelölteket nem bántja: a galéria végére kerül', async () => {
		const drawn = {
			documentUid: 'drawn-1',
			name: 'Badge — The Wave #1',
			filePath: 'https://example.test/drawn-1.png',
			generatedAt: 1,
		};
		const store = fakeDatabase({
			'music-collection/wave': {
				name: 'The Wave',
				badge: { name: 'Wave', gallery: [drawn], image: drawn },
			},
		});

		const adopted = await adoptBadgeImage(
			store.database,
			'wave',
			UPLOADED,
			'sajat-pin.png',
			NOW
		);
		const badge = store.documents['music-collection/wave'][
			'badge'
		] as Record<string, unknown>;

		expect(badge['gallery']).toEqual([drawn, adopted]);
		expect(badge['name']).toBe('Wave');
	});

	it('ugyanazt a fájlt másodszor nem iktatja be újra', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave' },
		});

		const first = await adoptBadgeImage(
			store.database,
			'wave',
			UPLOADED,
			'sajat-pin.png',
			NOW
		);
		const second = await adoptBadgeImage(
			store.database,
			'wave',
			UPLOADED,
			'sajat-pin.png',
			NOW + 1000
		);

		expect(second).toEqual(first);
		expect(
			(
				store.documents['music-collection/wave']['badge'] as Record<
					string,
					unknown
				>
			)['gallery']
		).toHaveLength(1);
	});

	it('a dokumentum-mappán kívülre nem enged mutatni', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave' },
		});

		mockFiles['bundles/catalog.json'] = {
			contentType: 'image/png',
			size: 10,
		};

		await expect(
			adoptBadgeImage(
				store.database,
				'wave',
				'bundles/catalog.json',
				'catalog.json',
				NOW
			)
		).rejects.toThrow('dokumentum-mappában');
	});

	it('nem képet nem iktat be', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave' },
		});

		mockFiles['document/notes.pdf'] = {
			contentType: 'application/pdf',
			size: 10,
		};

		await expect(
			adoptBadgeImage(
				store.database,
				'wave',
				'document/notes.pdf',
				'notes.pdf',
				NOW
			)
		).rejects.toThrow('nem kép');
	});

	it('nem létező collectionre nem ír semmit', async () => {
		const store = fakeDatabase({});

		await expect(
			adoptBadgeImage(store.database, 'wave', UPLOADED, 'pin.png', NOW)
		).rejects.toThrow('Nincs ilyen collection');
		expect(Object.keys(store.documents)).toHaveLength(0);
	});
});
