/**
 * A badge-generálás beállításai: amit az admin állíthat, és ahogyan a tárolt
 * dokumentumból beállítás lesz.
 *
 * Külön fájl a rajzolástól, mert az a `firebase-functions`-t is behúzza
 * (`HttpsError`), azon át pedig a firebase-admin auth ágát és egy
 * ESM-csomagot, amit a jest nem tud CommonJS-ként betölteni — a
 * beállítás-tisztítás viszont pure, és tesztelhetőnek kell maradnia. Ugyanez
 * a szétválasztás él a fotós kvótánál (`photo-scan-quota.ts`).
 */

import { Firestore } from 'firebase-admin/firestore';

/** Az alkalmazás-szintű beállítások; a kliens csak olvassa. */
export const APP_SETTING_COLLECTION = 'app-setting';
export const BADGE_SETTING_DOCUMENT = 'badge-generation';

/**
 * A gateway három ársávja, olcsóbbtól drágábbig. Nem modellnév: azt mondja
 * meg, mennyit szabad egy képre költeni, a sávhoz tartozó modellt pedig a
 * gateway rendeli hozzá.
 */
export const BADGE_QUALITY_PROFILES = ['economy', 'normal', 'premium'] as const;

export type BadgeQualityProfile = (typeof BADGE_QUALITY_PROFILES)[number];

/**
 * Mennyit tudjon a pin arról a collectionről, amelyiké.
 *
 * Ez nem ugyanaz, mint az ársáv, és szándékosan nem is arra van ráakasztva.
 * Az ársáv azt mondja meg, mennyibe kerülhet egy *kép*; ez azt, hogy mennyi
 * *tény* jut el a modellig, mielőtt rajzol. A kettő keresztbe is állhat: egy
 * olcsó modell is rajzolhat a valódi lemezekből, egy drága is rajzolhat
 * vakon. Ráadásul a `premium` sávhoz a gateway ma egyetlen képmodellt sem
 * rendel — ha a kontextus rá lenne kötve, a legbővebb szint elérhetetlen
 * lenne egy tőlünk független hiányosság miatt.
 *
 * - `catalog`: a szabály által elért valódi lemezek — a stílusuk többsége,
 *   a legkorábbi évük. Nincs plusz modellhívás, nincs plusz költség.
 * - `rich`: ezen felül a borítók színe adja a zománcot, és a lemezcímek
 *   visszatérő tárgyi szava egy második, kisebb motívumot. A borítót
 *   letöltjük és megnézzük, de modellt nem kérdezünk.
 * - `ai`: a fő motívumot egy szöveges modell írja a collection tényeiből,
 *   a kötött stíluszár közé. Badge-enként egy plusz hívás.
 */
export const BADGE_CONTEXT_LEVELS = ['catalog', 'rich', 'ai'] as const;

export type BadgeContextLevel = (typeof BADGE_CONTEXT_LEVELS)[number];

/**
 * Amit az admin felületről lehet állítani. A stíluszár nincs köztük: az
 * tartja egy készletben a badge-eket, és kódban marad, verziózva.
 *
 * A modell és a régió sincs köztük, mióta a rajzolás a gatewayen megy: a
 * gateway maga választ szolgáltatót és modellt a minőségi sáv alapján, és ő
 * tudja, melyik hol érhető el. Egy itteni modellnév csak felülbírálná a
 * tudását — és épp az volt a baj vele, hogy a felület a mi emlékezetünkből
 * kínált nevet, ami aztán 404-gyel halt el.
 *
 * Az ársáv viszont a mi döntésünk, ezért itt van: egy badge egyszer készül
 * el, és utána évekig néz vissza a polcról — nem ugyanaz a dolga, mint egy
 * olcsó háttérképnek. A sávhoz tartozó modellt továbbra is a gateway tudja.
 */
export interface BadgeGenerationSettings {
	/** Fut-e egyáltalán a generálás. Kikapcsolva a költség is nulla. */
	enabled: boolean;
	/** Hány jelölt készüljön egy kérésre — ennyiből választ az admin. */
	candidateCount: number;
	/** Napi felső korlát a generált képekre, hogy egy hiba ne vigyen vagyont. */
	dailyImageLimit: number;
	/** Melyik ársávban rajzoljon a gateway. */
	qualityProfile: BadgeQualityProfile;
	/** Mennyi tény jusson el a modellig a collectionről. */
	contextLevel: BadgeContextLevel;
}

export const DEFAULT_BADGE_SETTINGS: BadgeGenerationSettings = {
	enabled: true,
	candidateCount: 4,
	dailyImageLimit: 200,
	// A `normal` az, amihez a gateway minden tenantnál rendel modellt; a
	// másik kettő üresen is állhat, és akkor a kérés hibával jön vissza.
	qualityProfile: 'normal',
	// A `catalog` az, ami semmivel nem kerül többe a réginél, és már az is
	// igazat mond az évszámról — ezért ez az alapértelmezés, nem a `rich`.
	contextLevel: 'catalog',
};

/** A beállítás hiánya nem hiba: ilyenkor az alapértelmezés érvényes. */
export async function readBadgeSettings(
	database: Firestore
): Promise<BadgeGenerationSettings> {
	const snapshot = await database
		.collection(APP_SETTING_COLLECTION)
		.doc(BADGE_SETTING_DOCUMENT)
		.get();

	// Szűrve, nem szórva: a dokumentumban a napi számláló is itt lakik, és a
	// gateway előtti modell/régió mezők is itt maradtak. Egyik sem beállítás.
	return sanitizeBadgeSettings(snapshot.data() ?? {});
}

/** Az admin felület mentése. Csak a ismert mezők mennek át. */
export function sanitizeBadgeSettings(data: unknown): BadgeGenerationSettings {
	const input = (data ?? {}) as Partial<BadgeGenerationSettings>;
	const positive = (value: unknown, fallback: number, max: number): number =>
		typeof value === 'number' && Number.isFinite(value) && value > 0
			? Math.min(Math.floor(value), max)
			: fallback;

	return {
		enabled: input.enabled !== false,
		candidateCount: positive(
			input.candidateCount,
			DEFAULT_BADGE_SETTINGS.candidateCount,
			8
		),
		dailyImageLimit: positive(
			input.dailyImageLimit,
			DEFAULT_BADGE_SETTINGS.dailyImageLimit,
			2000
		),
		qualityProfile: BADGE_QUALITY_PROFILES.includes(
			input.qualityProfile as BadgeQualityProfile
		)
			? (input.qualityProfile as BadgeQualityProfile)
			: DEFAULT_BADGE_SETTINGS.qualityProfile,
		contextLevel: BADGE_CONTEXT_LEVELS.includes(
			input.contextLevel as BadgeContextLevel
		)
			? (input.contextLevel as BadgeContextLevel)
			: DEFAULT_BADGE_SETTINGS.contextLevel,
	};
}

/** Az admin felület mentése; a stíluszár szándékosan nincs köztük. */
export async function writeBadgeSettings(
	database: Firestore,
	data: unknown
): Promise<BadgeGenerationSettings> {
	const settings = sanitizeBadgeSettings(data);

	await database
		.collection(APP_SETTING_COLLECTION)
		.doc(BADGE_SETTING_DOCUMENT)
		.set(settings, { merge: true });

	return settings;
}
