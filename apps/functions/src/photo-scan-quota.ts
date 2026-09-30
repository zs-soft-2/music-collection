/**
 * A fotós azonosítás napi kerete — felhasználónként és az egész appra.
 *
 * Az `identifyRecordFromPhoto` és az `identifyShelfFromPhotos` minden hívása
 * legalább egy Anthropic vision kérés (a polcnál annyi, ahány fotó), tehát
 * pénz. Az App Check azt fogja meg, hogy a végpontot a mi appunk nélkül,
 * scriptből hívják; azt nem, hogy egy valódi, bejelentkezett gyűjtő a saját
 * böngészőjéből küldjön be ezer fotót egy délután. A jogosultság is csak
 * annyit mond, hogy a hívó gyűjthet — nem azt, hogy mennyit költhet.
 *
 * A minta a badge-generálásé (`badge-generation.ts`): a napi számláló a limit
 * mellett, ugyanabban a dokumentumban él, és a keretet a modell hívása ELŐTT
 * vonjuk le. A különbség, hogy ott egy admin nyomja a gombot, itt bárki, aki
 * gyűjt — ezért a keret itt felhasználónkénti, és a közös felső korlát csak
 * a végső fék mögötte.
 *
 * A felhasználó számlálója a saját user-dokumentuma alatt, naponta egy
 * dokumentumban él (`user/{uid}/scan-quota/{nap}`) — mint a napi kérdés
 * tippje. A gyűjtő olvashatja (látja, mennyit használt el), írni csak ez a
 * kód tudja: a firestore.rules `write: if false`-szal zárja, különben a
 * kliens minden reggel nullázná magát.
 */

import { Firestore } from 'firebase-admin/firestore';

import { gameDay } from './daily-question';

/**
 * A keret hibája. Nem `HttpsError`: a callable-ök fordítják azzá (`index.ts`),
 * mint a Discogsé és a napi kérdésé — a modul így a firebase-functions burka
 * nélkül is tesztelhető, és a hibakód a végpont dolga marad.
 */
export class ScanQuotaError extends Error {
	public constructor(
		message: string,
		/** `off`: ki van kapcsolva; `spent`: elfogyott a mai keret. */
		public readonly reason: 'off' | 'spent'
	) {
		super(message);
		this.name = 'ScanQuotaError';
	}
}

const APP_SETTING_COLLECTION = 'app-setting';
const PHOTO_SCAN_SETTING_DOCUMENT = 'photo-scan';
const USER_COLLECTION = 'user';
/** A gyűjtő napi számlálói: `user/{uid}/scan-quota/{nap}`. */
const SCAN_QUOTA_COLLECTION = 'scan-quota';

/** Amit a keretből állítani lehet. A számláló nem tartozik ide. */
export interface PhotoScanQuotaSettings {
	/** Fut-e egyáltalán a fotós azonosítás. Kikapcsolva a költség is nulla. */
	enabled: boolean;
	/** Ennyi modellkérést kezdeményezhet egy gyűjtő egy nap. */
	dailyUserRequestLimit: number;
	/** …és ennyit az összes gyűjtő együtt: a sok fiók elleni végső fék. */
	dailyTotalRequestLimit: number;
}

/**
 * A modell, amit a fotó kap, a drága fajta (`photo-signals.ts`: opus). Egy
 * lemez felvitele egy kérés, egy polcrekesz kettő — napi harminc kérés egy
 * gyűjtőnek egy komoly katalogizáló délutánt is kiszolgál, egy elszabadult
 * kliensnek viszont már nem elég ahhoz, hogy a keretet elköltse.
 */
export const DEFAULT_PHOTO_SCAN_QUOTA_SETTINGS: PhotoScanQuotaSettings = {
	enabled: true,
	dailyUserRequestLimit: 30,
	dailyTotalRequestLimit: 200,
};

/** Felső korlátok: az admin elírása ne vigyen el egy havi keretet. */
const MAX_USER_REQUEST_LIMIT = 500;
const MAX_TOTAL_REQUEST_LIMIT = 5000;

/** A nulla is érvényes válasz: az a „senki, ma nem". */
const bounded = (value: unknown, fallback: number, max: number): number =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0
		? Math.min(Math.floor(value), max)
		: fallback;

/**
 * Egy számláló tárolt értéke. Szigorúan szám: a `Number('x')` NaN-t adna, és
 * egy NaN minden összehasonlításból hamissal jön ki — a keret így pont attól
 * nyílna ki, amitől védeni kellene.
 */
const counted = (value: unknown): number =>
	typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;

/**
 * A tárolt dokumentum így válik beállítássá: ismert mezők, mindegyik a saját
 * korlátján belül. Callable nincs hozzá — a keretet a Firestore-ban (konzol
 * vagy script) írja át az admin, és egy elírt érték nem tud kárt tenni: a
 * vágás után legföljebb az alapértelmezés érvényes.
 */
export function sanitizePhotoScanQuotaSettings(
	data: unknown
): PhotoScanQuotaSettings {
	const input = (data ?? {}) as Partial<PhotoScanQuotaSettings>;
	const fallback = DEFAULT_PHOTO_SCAN_QUOTA_SETTINGS;

	return {
		enabled: input.enabled !== false,
		dailyUserRequestLimit: bounded(
			input.dailyUserRequestLimit,
			fallback.dailyUserRequestLimit,
			MAX_USER_REQUEST_LIMIT
		),
		dailyTotalRequestLimit: bounded(
			input.dailyTotalRequestLimit,
			fallback.dailyTotalRequestLimit,
			MAX_TOTAL_REQUEST_LIMIT
		),
	};
}

/** Ami a gyűjtőnek a mai napból megmaradt. */
export interface ScanQuotaState {
	day: string;
	/** Amit ma már elhasznált — a most levont kéréssel együtt. */
	used: number;
	limit: number;
	remaining: number;
}

/**
 * A keret levonása `count` modellkérésre. Ha nincs benne, `ScanQuotaError` —
 * a hívó ezt `resource-exhausted`-ként adja tovább, `source: 'quota'`
 * megjelöléssel: a kliensnek tudnia kell, hogy nem a modell és nem a Discogs
 * akadt el, hanem a saját kerete fogyott el. Abból más következik, mint egy
 * túlterhelt szolgáltatásból — az újrapróbálkozás itt nem segít.
 *
 * Előre vonunk le, nem utólag: a levonás után elszálló modellhívás így a
 * keretbe bele van számolva. Ez szándékos — a hívás a szolgáltatót akkor is
 * megterhelte, és egy „minden hiba ingyen" szabály mellett pont a hibázó
 * fotóval lehetne korlátlanul pörgetni a végpontot.
 *
 * A nap a gyűjtő napja (Europe/Budapest, mint a napi kérdésnél): a keret ott
 * forduljon, ahol a gyűjtő éjfele van, ne hajnali kettőkor.
 */
export async function reserveVisionRequests(
	database: Firestore,
	uid: string,
	count: number,
	now: number
): Promise<ScanQuotaState> {
	const day = gameDay(new Date(now));
	const setting = database
		.collection(APP_SETTING_COLLECTION)
		.doc(PHOTO_SCAN_SETTING_DOCUMENT);
	const mine = database
		.collection(USER_COLLECTION)
		.doc(uid)
		.collection(SCAN_QUOTA_COLLECTION)
		.doc(day);

	return database.runTransaction(async (transaction) => {
		const [settingSnapshot, mineSnapshot] = await transaction.getAll(
			setting,
			mine
		);
		const stored = settingSnapshot.data() ?? {};
		const settings = sanitizePhotoScanQuotaSettings(stored);

		if (!settings.enabled) {
			throw new ScanQuotaError(
				'A fotós azonosítás most ki van kapcsolva.',
				'off'
			);
		}

		// A dokumentum azonosítója a nap, tehát a tegnapi számláló nem ide
		// jött; a közös számláló viszont egy dokumentumban él a limittel, ezért
		// annak a napját meg kell kérdezni.
		const mineToday = counted(mineSnapshot.data()?.['requests']);
		const allToday =
			stored['usageDay'] === day ? counted(stored['usageCount']) : 0;

		if (mineToday + count > settings.dailyUserRequestLimit) {
			throw new ScanQuotaError(
				`A mai fotós keretedet elhasználtad (${settings.dailyUserRequestLimit} kérés). Holnap újra indul.`,
				'spent'
			);
		}
		if (allToday + count > settings.dailyTotalRequestLimit) {
			throw new ScanQuotaError(
				'A mai fotós keret elfogyott. Próbáld újra holnap.',
				'spent'
			);
		}

		transaction.set(
			mine,
			{ requests: mineToday + count, updatedAt: now },
			{ merge: true }
		);
		transaction.set(
			setting,
			{ usageDay: day, usageCount: allToday + count },
			{ merge: true }
		);

		return {
			day,
			used: mineToday + count,
			limit: settings.dailyUserRequestLimit,
			remaining: settings.dailyUserRequestLimit - mineToday - count,
		};
	});
}
