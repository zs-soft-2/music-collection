import { Firestore } from 'firebase-admin/firestore';

import { adoptBadgeDocument, adoptBadgeImage } from './badge-generation';

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

describe('adoptBadgeDocument', () => {
	const PICKED = {
		uid: 'pin-1',
		name: 'Badge — The Wave (feltöltött)',
		fileType: 'image/png',
		filePath: 'https://example.test/pin-1.png',
	};

	it('a meglévő dokumentumot teszi jelvénnyé, újat nem ír', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave' },
			'document/pin-1': PICKED,
		});

		const chosen = await adoptBadgeDocument(
			store.database,
			'wave',
			'pin-1',
			NOW
		);

		expect(chosen).toEqual({
			documentUid: 'pin-1',
			name: PICKED.name,
			filePath: PICKED.filePath,
			source: 'uploaded',
			generatedAt: NOW,
		});

		const badge = store.documents['music-collection/wave'][
			'badge'
		] as Record<string, unknown>;

		expect(badge['image']).toEqual(chosen);
		expect(badge['gallery']).toEqual([chosen]);
		// A dokumentum azé marad, akié volt: nem kap kategóriát, nem
		// keletkezik mellé másik, és a darabszám sem lép.
		expect(store.documents['document/pin-1']).toEqual(PICKED);
		expect(
			Object.keys(store.documents).filter((path) =>
				path.startsWith('document/')
			)
		).toEqual(['document/pin-1']);
	});

	it('a galériában már bent lévő képet nem fűzi be másodszor', async () => {
		const inGallery = {
			documentUid: 'pin-1',
			name: PICKED.name,
			filePath: PICKED.filePath,
			generatedAt: 1,
		};
		const store = fakeDatabase({
			'music-collection/wave': {
				name: 'The Wave',
				badge: { gallery: [inGallery] },
			},
			'document/pin-1': PICKED,
		});

		const chosen = await adoptBadgeDocument(
			store.database,
			'wave',
			'pin-1',
			NOW
		);
		const badge = store.documents['music-collection/wave'][
			'badge'
		] as Record<string, unknown>;

		expect(chosen).toEqual(inGallery);
		expect(badge['gallery']).toEqual([inGallery]);
		expect(badge['image']).toEqual(inGallery);
	});

	it('visszavont dokumentumot nem ajánl fel', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave' },
			'document/pin-1': { ...PICKED, deletedAt: NOW - 1000 },
		});

		await expect(
			adoptBadgeDocument(store.database, 'wave', 'pin-1', NOW)
		).rejects.toThrow('vissza van vonva');
		expect(
			store.documents['music-collection/wave']['badge']
		).toBeUndefined();
	});

	it('nem képet nem tesz jelvénnyé', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave' },
			'document/notes': {
				...PICKED,
				fileType: 'application/pdf',
			},
		});

		await expect(
			adoptBadgeDocument(store.database, 'wave', 'notes', NOW)
		).rejects.toThrow('nem kép');
	});

	it('nem létező dokumentumra nem ír semmit', async () => {
		const store = fakeDatabase({
			'music-collection/wave': { name: 'The Wave' },
		});

		await expect(
			adoptBadgeDocument(store.database, 'wave', 'pin-1', NOW)
		).rejects.toThrow('Nincs ilyen dokumentum');
		expect(
			store.documents['music-collection/wave']['badge']
		).toBeUndefined();
	});
});
