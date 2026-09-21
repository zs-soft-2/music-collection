/**
 * Badge-generálás: a collection definíciójából kép, a Vertex AI Imagennel.
 *
 * A badge egyszer készül el, és utána fix. Ezért a függvény nem egy képet
 * ad vissza, hanem többet: a jelöltek közül az admin választ, és csak a
 * választott fagy bele a definícióba. Így az utolsó szó emberé marad, a
 * munka viszont nem az övé.
 *
 * Amit a szerver nem enged ki a kezéből: a prompt. Az a
 * `music-collection-badge-prompt.ts`-ben épül, a collection tárolt adataiból
 * — a kliens csak a uid-et küldi. Máskülönben egy hívó tetszőleges képet
 * rajzoltathatna a mi számlánkra.
 *
 * A képek a Storage `badge/` útvonalára kerülnek, ahol a `storage.rules`
 * publikus olvasást enged és minden kliensírást tilt. A definíció csak az
 * objektum útvonalát őrzi, az URL-t a kliens oldja fel — ugyanúgy, ahogy a
 * borítóknál.
 */

import { Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleAuth } from 'google-auth-library';
import { HttpsError } from 'firebase-functions/v2/https';

import { stamp, touchCatalog } from './catalog-sync';
import {
	BADGE_STYLE_VERSION,
	BadgePrompt,
	buildBadgePrompt,
} from './music-collection-badge-prompt';

const MUSIC_COLLECTION_COLLECTION = 'music-collection';
/** `catalog-sync`: a kliens-cache ezen a kulcson látja a változást. */
const FEATURE_KEYS = [MUSIC_COLLECTION_COLLECTION];
/** Az alkalmazás-szintű beállítások; a kliens csak olvassa. */
const APP_SETTING_COLLECTION = 'app-setting';
const BADGE_SETTING_DOCUMENT = 'badge-generation';
/** A napi számláló ugyanabban a dokumentumban él, a limit mellett. */
const VERTEX_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

/** Amit az admin felületről lehet állítani. A stíluszár nincs köztük. */
export interface BadgeGenerationSettings {
	/** Fut-e egyáltalán a generálás. Kikapcsolva a költség is nulla. */
	enabled: boolean;
	/** Imagen modellazonosító, ahogy a Vertex publisher-útvonala kéri. */
	model: string;
	/** A Vertex régiója; nem feltétlenül a Firestore-é. */
	location: string;
	/** Hány jelölt készüljön egy kérésre — ennyiből választ az admin. */
	candidateCount: number;
	/** Napi felső korlát a generált képekre, hogy egy hiba ne vigyen vagyont. */
	dailyImageLimit: number;
}

export const DEFAULT_BADGE_SETTINGS: BadgeGenerationSettings = {
	enabled: true,
	model: 'imagen-4.0-generate-001',
	location: 'us-central1',
	candidateCount: 4,
	dailyImageLimit: 200,
};

/** Egy legenerált jelölt, amíg senki nem választott közülük. */
export interface BadgeCandidate {
	/** Storage-útvonal; az URL-t a kliens oldja fel. */
	path: string;
	index: number;
}

export interface GenerateBadgeResult {
	candidates: BadgeCandidate[];
	/** Amit a modell kapott — a badge mellé ez kerül, ha választanak. */
	prompt: string;
	negativePrompt: string;
	seed: number;
	styleVersion: number;
	model: string;
}

/** A beállítás hiánya nem hiba: ilyenkor az alapértelmezés érvényes. */
export async function readBadgeSettings(
	database: Firestore
): Promise<BadgeGenerationSettings> {
	const snapshot = await database
		.collection(APP_SETTING_COLLECTION)
		.doc(BADGE_SETTING_DOCUMENT)
		.get();

	return { ...DEFAULT_BADGE_SETTINGS, ...(snapshot.data() ?? {}) };
}

/** Az admin felület mentése. Csak a ismert mezők mennek át. */
export function sanitizeBadgeSettings(data: unknown): BadgeGenerationSettings {
	const input = (data ?? {}) as Partial<BadgeGenerationSettings>;
	const positive = (value: unknown, fallback: number, max: number): number =>
		typeof value === 'number' && Number.isFinite(value) && value > 0
			? Math.min(Math.floor(value), max)
			: fallback;
	const text = (value: unknown, fallback: string): string =>
		typeof value === 'string' && value.trim() ? value.trim() : fallback;

	return {
		enabled: input.enabled !== false,
		model: text(input.model, DEFAULT_BADGE_SETTINGS.model),
		location: text(input.location, DEFAULT_BADGE_SETTINGS.location),
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
	};
}

/** A ma elhasznált képek; a limit ennél nem enged tovább. */
async function reserveDailyQuota(
	database: Firestore,
	settings: BadgeGenerationSettings,
	count: number,
	now: number
): Promise<void> {
	const day = new Date(now).toISOString().slice(0, 10);
	const reference = database
		.collection(APP_SETTING_COLLECTION)
		.doc(BADGE_SETTING_DOCUMENT);

	await database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(reference);
		const data = snapshot.data() ?? {};
		const used =
			data['usageDay'] === day ? Number(data['usageCount'] ?? 0) : 0;

		if (used + count > settings.dailyImageLimit) {
			throw new HttpsError(
				'resource-exhausted',
				`A mai badge-keret elfogyott (${settings.dailyImageLimit} kép).`
			);
		}

		transaction.set(
			reference,
			{ usageDay: day, usageCount: used + count },
			{ merge: true }
		);
	});
}

/** A collection adatai, ahogy a prompt kéri őket. */
async function promptFor(
	database: Firestore,
	uid: string,
	points: number,
	now: number
): Promise<BadgePrompt> {
	const snapshot = await database
		.collection(MUSIC_COLLECTION_COLLECTION)
		.doc(uid)
		.get();
	const collection = snapshot.data();

	if (!collection) {
		throw new HttpsError('not-found', 'Nincs ilyen collection.');
	}

	const criteria = (collection['criteria'] ?? {}) as Record<string, unknown>;
	const styles = (criteria['styles'] ?? {}) as Record<string, unknown>;
	const years = (criteria['years'] ?? {}) as Record<string, unknown>;
	const artists = (criteria['artists'] ?? {}) as Record<string, unknown>;
	const includesAny = Array.isArray(styles['includesAny'])
		? (styles['includesAny'] as string[])
		: [];
	const artistUids = Array.isArray(artists['includesAny'])
		? (artists['includesAny'] as string[])
		: [];
	const from =
		typeof years['from'] === 'number' ? (years['from'] as number) : null;
	const equals =
		typeof years['equals'] === 'number'
			? (years['equals'] as number)
			: null;

	return buildBadgePrompt(
		{
			styles: includesAny,
			earliestYear: from ?? equals,
			points,
			isSingleArtist: artistUids.length === 1,
			slug: String(collection['slug'] ?? uid),
		},
		now
	);
}

/** A Vertex predict-végpont egy kéréssel, több mintával. */
async function predict(
	settings: BadgeGenerationSettings,
	projectId: string,
	built: BadgePrompt
): Promise<string[]> {
	const auth = new GoogleAuth({ scopes: [VERTEX_SCOPE] });
	const token = await auth.getAccessToken();
	const endpoint =
		`https://${settings.location}-aiplatform.googleapis.com/v1/projects/` +
		`${projectId}/locations/${settings.location}/publishers/google/models/` +
		`${settings.model}:predict`;
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			instances: [{ prompt: built.prompt }],
			parameters: {
				sampleCount: settings.candidateCount,
				aspectRatio: built.aspectRatio,
				negativePrompt: built.negativePrompt,
				// A seed csak vízjel nélkül engedélyezett.
				seed: built.seed % 2147483647,
				addWatermark: false,
				personGeneration: 'dont_allow',
			},
		}),
	});

	if (!response.ok) {
		throw new HttpsError(
			'internal',
			`A képmodell hibát adott (${response.status}): ${await response.text()}`
		);
	}

	const body = (await response.json()) as {
		predictions?: { bytesBase64Encoded?: string }[];
	};
	const images = (body.predictions ?? [])
		.map((prediction) => prediction.bytesBase64Encoded)
		.filter((value): value is string => Boolean(value));

	if (!images.length) {
		throw new HttpsError(
			'internal',
			'A képmodell egyetlen képet sem adott vissza.'
		);
	}

	return images;
}

/**
 * Jelöltek egy collectionhöz. A `points` a kliens feloldásából jön — csak a
 * perem gazdagságát mozdítja, a prompt szövegéhez nem fér hozzá —, ezért
 * elég józan határok közé szorítani.
 */
export async function generateBadgeCandidates(
	database: Firestore,
	projectId: string,
	uid: string,
	points: unknown,
	now: number
): Promise<GenerateBadgeResult> {
	const settings = await readBadgeSettings(database);

	if (!settings.enabled) {
		throw new HttpsError(
			'failed-precondition',
			'A badge-generálás ki van kapcsolva.'
		);
	}

	const safePoints =
		typeof points === 'number' && Number.isFinite(points) && points > 0
			? Math.min(Math.floor(points), 10000)
			: 0;
	const built = await promptFor(database, uid, safePoints, now);

	await reserveDailyQuota(database, settings, settings.candidateCount, now);

	const images = await predict(settings, projectId, built);
	const bucket = getStorage().bucket();
	const candidates: BadgeCandidate[] = [];

	for (const [index, image] of images.entries()) {
		const path = `badge/${uid}/v${BADGE_STYLE_VERSION}-${now}-${index}.png`;

		await bucket.file(path).save(Buffer.from(image, 'base64'), {
			contentType: 'image/png',
			metadata: { cacheControl: 'public, max-age=31536000, immutable' },
		});

		candidates.push({ path, index });
	}

	return {
		candidates,
		prompt: built.prompt,
		negativePrompt: built.negativePrompt,
		seed: built.seed,
		styleVersion: built.styleVersion,
		model: settings.model,
	};
}

/** Amit a kiválasztott badge-ről megőrzünk, hogy újraelőállítható legyen. */
export interface BadgeImage {
	/** Storage-útvonal; az URL-t a kliens oldja fel. */
	path: string;
	prompt: string;
	negativePrompt: string;
	seed: number;
	styleVersion: number;
	model: string;
	/** Epoch ezredmásodperc. */
	generatedAt: number;
}

/** A jelöltek közül a választott befagyasztása a definícióba. */
export async function setBadgeImage(
	database: Firestore,
	uid: unknown,
	image: unknown,
	now: number
): Promise<{ uid: string }> {
	if (typeof uid !== 'string' || !uid.trim()) {
		throw new HttpsError('invalid-argument', 'Hiányzó uid.');
	}

	const input = (image ?? {}) as Partial<BadgeImage>;

	// A kép csak a saját collectionje alól jöhet: a kliens nem mutathat rá
	// egy másik badge-re, és a bucketen kívülre sem.
	if (
		typeof input.path !== 'string' ||
		!input.path.startsWith(`badge/${uid}/`)
	) {
		throw new HttpsError('invalid-argument', 'Érvénytelen kép-útvonal.');
	}

	const reference = database
		.collection(MUSIC_COLLECTION_COLLECTION)
		.doc(uid.trim());

	await database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(reference);

		if (!snapshot.exists) {
			throw new HttpsError('not-found', 'Nincs ilyen collection.');
		}

		const badge = (snapshot.data()?.['badge'] ?? {}) as Record<
			string,
			unknown
		>;

		transaction.set(
			reference,
			stamp({
				badge: {
					...badge,
					image: {
						path: input.path,
						prompt: String(input.prompt ?? ''),
						negativePrompt: String(input.negativePrompt ?? ''),
						seed: Number(input.seed ?? 0),
						styleVersion: Number(
							input.styleVersion ?? BADGE_STYLE_VERSION
						),
						model: String(input.model ?? ''),
						generatedAt: now,
					},
				},
			}),
			{ merge: true }
		);
		touchCatalog(database, transaction, FEATURE_KEYS);
	});

	return { uid: uid.trim() };
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
