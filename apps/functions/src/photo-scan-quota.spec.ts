import { Firestore } from 'firebase-admin/firestore';

import {
	ScanQuotaError,
	reserveVisionRequests,
	sanitizePhotoScanQuotaSettings,
} from './photo-scan-quota';

// ── Firestore-utánzat tranzakcióval ────────────────────────────────────────
//
// A keretnél nem az adat a kérdés, hanem hogy mit engedett át és mit írt fel:
// a hamis adatbázis ezért útvonal szerint tart dokumentumokat, és számon tartja
// az írásokat. A tranzakció itt azonnal érvényesít — egy tranzakcióban egy
// levonás van, tehát a valódi Firestore „a commitig nem látod" szabálya ezen a
// kódon nem látszik.

interface Write {
	path: string;
	data: Record<string, unknown>;
}

function fakeDatabase(documents: Record<string, Record<string, unknown>>) {
	const writes: Write[] = [];
	const reference = (path: string): any => ({
		path,
		collection: (name: string) => ({
			doc: (id: string) => reference(`${path}/${name}/${id}`),
		}),
	});
	const snapshot = (path: string) => ({
		exists: !!documents[path],
		data: () => documents[path],
	});
	const database = {
		collection: (name: string) => ({
			doc: (id: string) => reference(`${name}/${id}`),
		}),
		runTransaction: async (body: (transaction: any) => Promise<unknown>) =>
			body({
				getAll: async (...references: { path: string }[]) =>
					references.map((held) => snapshot(held.path)),
				set: (
					held: { path: string },
					data: Record<string, unknown>
				) => {
					documents[held.path] = {
						...(documents[held.path] ?? {}),
						...data,
					};
					writes.push({ path: held.path, data });
				},
			}),
	} as unknown as Firestore;

	return { database, documents, writes };
}

const SETTING = 'app-setting/photo-scan';
/** Budapesten dél; a nap tehát szeptember 29. */
const NOON = Date.UTC(2026, 8, 29, 10, 0);
const MY_DAY = 'user/collector-1/scan-quota/2026-09-29';

describe('reserveVisionRequests', () => {
	it('levonja a keretet, és a gyűjtő napi dokumentumába írja', async () => {
		const store = fakeDatabase({});

		const state = await reserveVisionRequests(
			store.database,
			'collector-1',
			2,
			NOON
		);

		expect(state).toEqual({
			day: '2026-09-29',
			used: 2,
			limit: 30,
			remaining: 28,
		});
		expect(store.documents[MY_DAY]).toMatchObject({ requests: 2 });
		expect(store.documents[SETTING]).toMatchObject({
			usageDay: '2026-09-29',
			usageCount: 2,
		});
	});

	it('a keret a gyűjtőé — a másik gyűjtő napja nem az övé', async () => {
		const store = fakeDatabase({
			'user/collector-2/scan-quota/2026-09-29': { requests: 30 },
		});

		const state = await reserveVisionRequests(
			store.database,
			'collector-1',
			1,
			NOON
		);

		expect(state.used).toBe(1);
	});

	it('az utolsó kérés még belefér a napi keretbe', async () => {
		const store = fakeDatabase({ [MY_DAY]: { requests: 29 } });

		const state = await reserveVisionRequests(
			store.database,
			'collector-1',
			1,
			NOON
		);

		expect(state.remaining).toBe(0);
	});

	it('a napi keretén túl nem megy, és nem is ír semmit', async () => {
		const store = fakeDatabase({ [MY_DAY]: { requests: 29 } });
		const refused = reserveVisionRequests(
			store.database,
			'collector-1',
			2,
			NOON
		);

		await expect(refused).rejects.toBeInstanceOf(ScanQuotaError);
		await expect(refused).rejects.toMatchObject({ reason: 'spent' });
		expect(store.writes).toHaveLength(0);
		expect(store.documents[MY_DAY]).toEqual({ requests: 29 });
	});

	it('a közös keret a végső fék a sok fiók ellen', async () => {
		const store = fakeDatabase({
			[SETTING]: {
				dailyTotalRequestLimit: 5,
				usageDay: '2026-09-29',
				usageCount: 4,
			},
		});

		await expect(
			reserveVisionRequests(store.database, 'collector-1', 2, NOON)
		).rejects.toMatchObject({ reason: 'spent' });
		expect(store.writes).toHaveLength(0);
	});

	it('a tegnapi közös számláló nem számít bele a maiba', async () => {
		const store = fakeDatabase({
			[SETTING]: {
				dailyTotalRequestLimit: 5,
				usageDay: '2026-09-28',
				usageCount: 500,
			},
		});

		const state = await reserveVisionRequests(
			store.database,
			'collector-1',
			1,
			NOON
		);

		expect(state.used).toBe(1);
		expect(store.documents[SETTING]).toMatchObject({
			usageDay: '2026-09-29',
			usageCount: 1,
		});
	});

	/**
	 * Egy szám helyén álló szemét (elnevezett mező, kézi javítás a konzolon)
	 * NaN-t adna, és a NaN minden összehasonlításból hamissal jön ki — a keret
	 * pont attól nyílna ki, amitől védeni kellene. Nullának vesszük.
	 */
	it('a nem szám számlálót nem engedi a keret fölé', async () => {
		const store = fakeDatabase({ [MY_DAY]: { requests: 'sok' } });

		const state = await reserveVisionRequests(
			store.database,
			'collector-1',
			1,
			NOON
		);

		expect(state.used).toBe(1);
	});

	it('kikapcsolva egy kérés sem megy el', async () => {
		const store = fakeDatabase({ [SETTING]: { enabled: false } });

		await expect(
			reserveVisionRequests(store.database, 'collector-1', 1, NOON)
		).rejects.toMatchObject({ reason: 'off' });
		expect(store.writes).toHaveLength(0);
	});

	/**
	 * A nap ott fordul, ahol a gyűjtő éjfele van. UTC-vel a keret nyáron
	 * hajnali kettőkor indulna újra — az éjfél után fotózó gyűjtő pedig a
	 * tegnapi keretéből költene.
	 */
	it('a nap a gyűjtő éjfelénél fordul, nem UTC szerint', async () => {
		const store = fakeDatabase({});
		const afterMidnightInBudapest = Date.UTC(2026, 8, 29, 23, 30);

		const state = await reserveVisionRequests(
			store.database,
			'collector-1',
			1,
			afterMidnightInBudapest
		);

		expect(state.day).toBe('2026-09-30');
		expect(
			store.documents['user/collector-1/scan-quota/2026-09-30']
		).toMatchObject({ requests: 1 });
	});
});

describe('sanitizePhotoScanQuotaSettings', () => {
	it('a hiányzó dokumentumra az alapértelmezés érvényes', () => {
		expect(sanitizePhotoScanQuotaSettings(undefined)).toEqual({
			enabled: true,
			dailyUserRequestLimit: 30,
			dailyTotalRequestLimit: 200,
		});
	});

	it('a nulla érvényes keret: senki, ma nem', () => {
		expect(
			sanitizePhotoScanQuotaSettings({ dailyUserRequestLimit: 0 })
				.dailyUserRequestLimit
		).toBe(0);
	});

	it('az elírt keretet a felső korlát vágja, a szemetet az alapértelmezés', () => {
		const settings = sanitizePhotoScanQuotaSettings({
			dailyUserRequestLimit: 50_000,
			dailyTotalRequestLimit: 'sok',
		});

		expect(settings.dailyUserRequestLimit).toBe(500);
		expect(settings.dailyTotalRequestLimit).toBe(200);
	});

	it('a negatív szám nem keret', () => {
		expect(
			sanitizePhotoScanQuotaSettings({ dailyUserRequestLimit: -5 })
				.dailyUserRequestLimit
		).toBe(30);
	});
});
