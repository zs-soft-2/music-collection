import { Firestore } from 'firebase-admin/firestore';

import {
	adoptBadgeDocument,
	adoptBadgeImage,
	drawImages,
} from './badge-generation';

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
			message: string,
			// A `details` nem dísz: ezen utazik a kliensig az, hogy *miféle*
			// hiba volt, és az admin felülete ebből dönti el, kiírja-e a
			// szerver mondatát a saját kész szövege helyett.
			public readonly details?: unknown
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

// ── A kép nélküli „sikeres" válasz ────────────────────────────────────────
//
// 2026-10-13: a gateway nyolc és fél másodperc után sikert jelentett, nulla
// dollárral, kép nélkül. Nálunk ebből egy 500 lett, aminek az üzenete
// annyit mondott, hogy nincs kép — se azt, melyik modell, se azt, mit
// felelt helyette. Ez a néhány teszt azt a kört őrzi, ami ezt megtörte.

/** Egy gateway, ami azt adja vissza, amit a teszt mond neki. */
function fakeGateway(answer: unknown) {
	return {
		execute: jest.fn(async () => answer),
	} as unknown as Parameters<typeof drawImages>[0];
}

const DRAW = {
	prompt: 'Antique cast pewter enamel pin badge, a horned skull.',
	size: '1024x1024',
	count: 2,
	qualityProfile: 'economy' as const,
	model: 'valami-image',
};

/** Amit a hibából a kliens olvas. */
function reasonOf(error: unknown): unknown {
	return (error as { details?: { reason?: unknown } })?.details?.reason;
}

describe('drawImages', () => {
	it('a beágyazott képeket adja vissza, a rajzoló modell nevével', async () => {
		const drawn = await drawImages(
			fakeGateway({
				kind: 'result',
				status: 'succeeded',
				model: 'gpt-image-1',
				output: { images: [{ b64: 'AAAA' }, { b64: 'BBBB' }] },
			}),
			DRAW
		);

		expect(drawn).toStrictEqual({
			images: ['AAAA', 'BBBB'],
			model: 'gpt-image-1',
		});
	});

	/**
	 * A szerződés szerint a képek az `images`-ben jönnek, de ugyanaz a
	 * kimenet ismeri a `mediaUrl`-t is. Egy kifizetett kép nem veszhet el
	 * azon, hogy melyik mezőben állt.
	 */
	it('a mediaUrl-ben érkezett egyetlen képet is elfogadja', async () => {
		const fetched = jest.fn(async () => ({
			ok: true,
			status: 200,
			arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
		}));

		(globalThis as unknown as { fetch: unknown }).fetch = fetched;

		const drawn = await drawImages(
			fakeGateway({
				kind: 'result',
				status: 'succeeded',
				model: 'valami-image',
				output: { mediaUrl: 'https://gateway/kep.png', images: [] },
			}),
			DRAW
		);

		expect(fetched).toHaveBeenCalledWith('https://gateway/kep.png');
		expect(drawn.images).toStrictEqual([
			Buffer.from(new Uint8Array([1, 2, 3])).toString('base64'),
		]);
	});

	it('kép nélküli válaszból megnevezett ok lesz', async () => {
		expect.assertions(3);

		try {
			await drawImages(
				fakeGateway({
					kind: 'result',
					status: 'succeeded',
					model: 'gemini-3.1-flash-image',
					output: {},
					cost: { totalCost: 0 },
				}),
				DRAW
			);
		} catch (error) {
			expect(reasonOf(error)).toBe('no-image');
			expect((error as Error).message).toContain('egyetlen képet sem');
			// A modell neve az üzenetben: a padon az a következő lépés.
			expect((error as Error).message).toContain(
				'gemini-3.1-flash-image'
			);
		}
	});

	/**
	 * Egy képkérésre adott próza az elzárkózás alakja. Az admin ezt akarja
	 * olvasni, nem azt, hogy „nincs kép".
	 */
	it('a modell szövegét az üzenetbe teszi', async () => {
		expect.assertions(2);

		try {
			await drawImages(
				fakeGateway({
					kind: 'result',
					status: 'succeeded',
					model: 'gemini-3.1-flash-image',
					output: { text: 'I cannot draw a real band’s mascot.' },
				}),
				DRAW
			);
		} catch (error) {
			expect(reasonOf(error)).toBe('no-image');
			expect((error as Error).message).toContain('I cannot draw');
		}
	});

	it('a gateway elutasítása más ok, mint a néma válasz', async () => {
		expect.assertions(1);

		const client = {
			execute: jest.fn(async () => {
				throw new Error('kapcsolat megszakadt');
			}),
		} as unknown as Parameters<typeof drawImages>[0];

		try {
			await drawImages(client, DRAW);
		} catch (error) {
			expect(reasonOf(error)).toBe('gateway-error');
		}
	});

	/** A rajzolás szinkron: egy `accepted` válasz szerződésváltozás volna. */
	it('a végrehajtásnak vett rajzolást elutasítja', async () => {
		expect.assertions(1);

		try {
			await drawImages(
				fakeGateway({ kind: 'accepted', executionId: 'x' }),
				DRAW
			);
		} catch (error) {
			expect(reasonOf(error)).toBe('unexpected-shape');
		}
	});
});
