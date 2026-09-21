/**
 * Badge-generálás: a collection definíciójából kép, egy Vertex képmodellel.
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

import { randomUUID } from 'node:crypto';

import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import objectHash from 'object-hash';
import { GoogleAuth } from 'google-auth-library';
import { logger } from 'firebase-functions/v2';
import { HttpsError } from 'firebase-functions/v2/https';

import { stamp, touchCatalog } from './catalog-sync';
import {
	BADGE_STYLE_VERSION,
	BadgePrompt,
	buildBadgePrompt,
} from './music-collection-badge-prompt';

const MUSIC_COLLECTION_COLLECTION = 'music-collection';
/**
 * Minden Storage-ban heverő fájl fölött van egy dokumentum: az adja neki a
 * nevet, a típust és a letöltési URL-t, és azon keresztül lehet metaadattal
 * körbevenni. A badge sem kivétel — a borítókkal egy helyre, egy szabály alá
 * kerül.
 */
const DOCUMENT_COLLECTION = 'document';
/** A `DocumentUtilService.createFilePath` mintája: mappa + a név hashe. */
const DOCUMENT_FOLDER = '/document/';
/** `libs/common/api` EntityTypeEnum.Document. */
const DOCUMENT_ENTITY_TYPE = 'Document';
/** Az admin darabszámláló dokumentuma, amit a kliens is karbantart. */
const ENTITY_QUANTITY_COLLECTION = 'entity-quantity';
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
	/** Vertex képmodell, ahogy a publisher-útvonal írja. A lista élő. */
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
	model: 'gemini-2.5-flash-image',
	location: 'us-central1',
	candidateCount: 4,
	dailyImageLimit: 200,
};

/**
 * Egy legenerált jelölt. Szándékosan NEM fájl: a jelölt háromnegyede
 * eldobásra születik, és egy Storage-objektum, ami fölött nincs dokumentum,
 * pont az a szemét, amit a katalógus elkerül. Amíg nem választanak, a kép a
 * válaszban utazik, és sehol nem landol.
 */
export interface BadgeCandidate {
	index: number;
	/** `data:image/png;base64,…` — közvetlenül `<img src>`-be tehető. */
	dataUrl: string;
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

/**
 * A régió API-hosztja. A `global` a kivétel: annak nincs régió-előtagja, és
 * épp ott érhetők el azok a modellek, amelyek egy nevesített régióban nem.
 */
function hostOf(location: string): string {
	return location === 'global'
		? 'https://aiplatform.googleapis.com'
		: `https://${location}-aiplatform.googleapis.com`;
}

/** Egy modell teljes publisher-útvonala a hívott művelettel. */
function endpointOf(
	location: string,
	projectId: string,
	model: string,
	action: string
): string {
	return (
		`${hostOf(location)}/v1/projects/${projectId}/locations/` +
		`${location}/publishers/google/models/${model}:${action}`
	);
}

/** Egy kép a modelltől. A jelölteket a hívó szorozza. */
async function generateImage(
	settings: BadgeGenerationSettings,
	projectId: string,
	prompt: string,
	aspectRatio: string,
	token: string
): Promise<string> {
	const response = await fetch(
		endpointOf(
			settings.location,
			projectId,
			settings.model,
			'generateContent'
		),
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				generationConfig: {
					responseModalities: ['IMAGE'],
					imageConfig: { aspectRatio },
				},
			}),
		}
	);

	if (!response.ok) {
		// A modell neve és a régió benne van, mert a 404 leggyakoribb oka
		// az, hogy a beállított modell ebben a régióban nem létezik.
		throw new HttpsError(
			'internal',
			`A képmodell (${settings.model} @ ${settings.location}) ` +
				`hibát adott (${response.status}): ${await response.text()}`
		);
	}

	const body = (await response.json()) as {
		candidates?: {
			content?: { parts?: { inlineData?: { data?: string } }[] };
		}[];
	};
	const image = body.candidates?.[0]?.content?.parts?.find(
		(part) => part.inlineData?.data
	)?.inlineData?.data;

	if (!image) {
		throw new HttpsError(
			'internal',
			'A képmodell egyetlen képet sem adott vissza.'
		);
	}

	return image;
}

/**
 * A jelöltek. Egy `generateContent` egy képet ad, ezért a jelöltek külön,
 * párhuzamos hívásokból állnak össze.
 *
 * Ami az Imagen `:predict` protokolljából nem él tovább: a `negativePrompt`
 * a prompt szövegébe olvad, a képarány az `imageConfig`-ba, a `seed` pedig
 * már csak a feljegyzésben marad — a modellt nem vezeti, vagyis ugyanaz a
 * collection nem ugyanazt a pint önti újra.
 */
async function predict(
	settings: BadgeGenerationSettings,
	projectId: string,
	built: BadgePrompt
): Promise<string[]> {
	const auth = new GoogleAuth({ scopes: [VERTEX_SCOPE] });
	const token = await auth.getAccessToken();

	if (!token) {
		throw new HttpsError('internal', 'Nincs Vertex hozzáférési token.');
	}

	const prompt = `${built.prompt} Do not include: ${built.negativePrompt}.`;

	return Promise.all(
		Array.from({ length: settings.candidateCount }, () =>
			generateImage(settings, projectId, prompt, built.aspectRatio, token)
		)
	);
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

	return {
		candidates: images.map((image, index) => ({
			index,
			dataUrl: `data:image/png;base64,${image}`,
		})),
		prompt: built.prompt,
		negativePrompt: built.negativePrompt,
		seed: built.seed,
		styleVersion: built.styleVersion,
		model: settings.model,
	};
}

/**
 * Amit a kiválasztott badge-ről megőrzünk. A fájl maga egy `document/{uid}`
 * entitás alatt él — onnan jön a neve és a letöltési URL-je —, az itteni
 * mezők pedig azok, amiknek a dokumentumban nincs helyük: ezek nélkül a
 * badge nem állítható elő újra.
 */
export interface BadgeImage {
	/** A `document` entitás, ami a fájlt körbeveszi. */
	documentUid: string;
	name: string;
	/** A kész letöltési URL, ahogy a borítóknál is — egyenesen `<img src>`-be. */
	filePath: string;
	prompt: string;
	negativePrompt: string;
	seed: number;
	styleVersion: number;
	model: string;
	/** Epoch ezredmásodperc. */
	generatedAt: number;
}

/** A base64 kép mérete józan határon belül; enélkül a memória a határ. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * A fájl feltöltése oda, ahová a borítók is mennek, és a `getDownloadURL`
 * alakú URL előállítása. A kliens SDK tokenes URL-t ad vissza; ugyanolyat
 * adunk, hogy a `filePath` mezők egyformák legyenek a katalógusban.
 */
async function uploadDocumentFile(
	image: Buffer,
	fileName: string
): Promise<{ filePath: string; storagePath: string }> {
	const bucket = getStorage().bucket();
	// `DocumentUtilService.createFilePath`: mappa + a fájlnév hashe. A vezető
	// perjelet a kliens SDK lenyeli, az Admin SDK nem — itt kell levenni.
	const storagePath = `${DOCUMENT_FOLDER}${objectHash(fileName)}`.replace(
		/^\//,
		''
	);
	const token = randomUUID();

	await bucket.file(storagePath).save(image, {
		contentType: 'image/png',
		metadata: {
			cacheControl: 'public, max-age=31536000, immutable',
			metadata: { firebaseStorageDownloadTokens: token },
		},
	});

	return {
		storagePath,
		filePath:
			`https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
			`/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`,
	};
}

/**
 * A választott jelölt befagyasztása: fájl a Storage-be, fölé egy dokumentum,
 * és a definícióba a rá mutató hivatkozás.
 *
 * A képet a kliens küldi vissza, mert a jelöltek sehol nem voltak eltárolva —
 * így viszont csak az az egy kép lesz fájl, amelyiket tényleg akarjuk.
 */
export async function setBadgeImage(
	database: Firestore,
	uid: unknown,
	image: unknown,
	now: number
): Promise<{ uid: string; documentUid: string }> {
	if (typeof uid !== 'string' || !uid.trim()) {
		throw new HttpsError('invalid-argument', 'Hiányzó uid.');
	}

	const collectionUid = uid.trim();
	const input = (image ?? {}) as Partial<BadgeImage> & { image?: unknown };

	if (typeof input.image !== 'string' || !input.image) {
		throw new HttpsError('invalid-argument', 'Hiányzik a kép.');
	}

	const bytes = Buffer.from(input.image, 'base64');

	if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
		throw new HttpsError('invalid-argument', 'A kép mérete érvénytelen.');
	}

	const reference = database
		.collection(MUSIC_COLLECTION_COLLECTION)
		.doc(collectionUid);
	const snapshot = await reference.get();

	if (!snapshot.exists) {
		throw new HttpsError('not-found', 'Nincs ilyen collection.');
	}

	const collectionName = String(snapshot.get('name') ?? collectionUid);
	const styleVersion = Number(input.styleVersion ?? BADGE_STYLE_VERSION);
	const originalName = `${snapshot.get('slug') ?? collectionUid}-badge-v${styleVersion}-${now}.png`;
	const { filePath, storagePath } = await uploadDocumentFile(
		bytes,
		originalName
	);
	const documentReference = database.collection(DOCUMENT_COLLECTION).doc();
	const name = `Badge — ${collectionName}`;

	await database.runTransaction(async (transaction) => {
		// A fájl fölötti dokumentum: innentől a katalógus tud róla, és itt
		// lehet metaadattal körbevenni.
		transaction.set(
			documentReference,
			stamp({
				uid: documentReference.id,
				entityType: DOCUMENT_ENTITY_TYPE,
				name,
				originalName,
				fileType: 'image/png',
				filePath,
				createdAt: now,
			})
		);
		// Az admin darabszám, amit egyébként a kliens léptet.
		transaction.set(
			database
				.collection(ENTITY_QUANTITY_COLLECTION)
				.doc(DOCUMENT_ENTITY_TYPE),
			{
				type: DOCUMENT_ENTITY_TYPE,
				quantity: FieldValue.increment(1),
				modifyDate: new Date(now),
			},
			{ merge: true }
		);

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
						documentUid: documentReference.id,
						name,
						filePath,
						prompt: String(input.prompt ?? ''),
						negativePrompt: String(input.negativePrompt ?? ''),
						seed: Number(input.seed ?? 0),
						styleVersion,
						model: String(input.model ?? ''),
						generatedAt: now,
					},
				},
			}),
			{ merge: true }
		);
		touchCatalog(database, transaction, [
			MUSIC_COLLECTION_COLLECTION,
			DOCUMENT_COLLECTION,
		]);
	});

	logger.info(
		`badge mentve: ${collectionUid} → document/${documentReference.id} (${storagePath})`
	);

	return { uid: collectionUid, documentUid: documentReference.id };
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

/**
 * Amit a katalógusban képgenerálásnak ismerünk el. A Vertex sok „image"
 * nevű modellt listáz, ami osztályoz vagy szegmentál; rajzolni csak az
 * Imagen és a Gemini képmodelljei tudnak.
 */
const IMAGE_MODEL_PATTERN =
	/^(imagen-[\d.]+[a-z0-9-]*|gemini-[\d.]+-[a-z-]*image[a-z0-9-]*)$/;

/** Egy választható modell az admin felületnek. */
export interface BadgeModelOption {
	/** A modellnév, ahogy a publisher-útvonal írja. */
	name: string;
	/**
	 * Válaszol-e ebben a régióban. A katalógus olyat is listáz, amit a
	 * projekt nem hívhat — a beállított modell éppen így tudott hónapokig
	 * 404-et adni.
	 */
	isReachable: boolean;
}

/**
 * Egy ingyenes létezés-próba: üres `contents`-szel a meglévő modell 400-at
 * ad (hiányzik a kérés törzse), a nem létező 404-et. Kép nem készül, tehát
 * a lista nem kerül pénzbe.
 */
async function isReachable(
	location: string,
	projectId: string,
	model: string,
	token: string
): Promise<boolean> {
	try {
		const response = await fetch(
			endpointOf(location, projectId, model, 'generateContent'),
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ contents: [] }),
			}
		);

		return response.status === 400;
	} catch {
		return false;
	}
}

/**
 * A választható képmodellek, a beállított régióból, élőben.
 *
 * Ez a függvény azért van, mert a modellnév egyszer tippből került a
 * kódba, és a generálás 404-gyel halt el, amíg valaki észre nem vette. A
 * felületnek nem szabad a mi emlékezetünkből választania.
 */
export async function listBadgeModels(
	database: Firestore,
	projectId: string
): Promise<BadgeModelOption[]> {
	const settings = await readBadgeSettings(database);
	const auth = new GoogleAuth({ scopes: [VERTEX_SCOPE] });
	const token = await auth.getAccessToken();

	if (!token) {
		throw new HttpsError('internal', 'Nincs Vertex hozzáférési token.');
	}

	const response = await fetch(
		`${hostOf(settings.location)}/v1beta1/publishers/google/models` +
			`?pageSize=200&view=PUBLISHER_MODEL_VIEW_BASIC`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				'x-goog-user-project': projectId,
			},
		}
	);

	if (!response.ok) {
		throw new HttpsError(
			'internal',
			`A modellkatalógus hibát adott (${response.status}): ` +
				`${await response.text()}`
		);
	}

	const body = (await response.json()) as {
		publisherModels?: { name?: string }[];
	};
	const names = (body.publisherModels ?? [])
		.map((model) => (model.name ?? '').split('/').pop() ?? '')
		.filter((name) => IMAGE_MODEL_PATTERN.test(name));

	// A beállított modell mindig szerepel, akkor is, ha a katalógus már nem
	// ismeri: különben a felület megnyitása csendben másikra váltaná.
	if (!names.includes(settings.model)) {
		names.push(settings.model);
	}

	const options = await Promise.all(
		names.sort().map(async (name) => ({
			name,
			isReachable: await isReachable(
				settings.location,
				projectId,
				name,
				token
			),
		}))
	);

	return options;
}
