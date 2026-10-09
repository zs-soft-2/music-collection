/**
 * Badge-generálás: a collection definíciójából kép, az AI-gatewayen át.
 *
 * A badge egyszer készül el, és utána fix. Ezért a függvény nem egy képet
 * ad vissza, hanem többet: a jelöltek közül az admin választ, és csak a
 * választott fagy bele a definícióba. Így az utolsó szó emberé marad, a
 * munka viszont nem az övé.
 *
 * A többi jelölt attól még nem szemét: a modellt egyszer kifizettük értük.
 * Ezért mindegyik megmarad — a definíció galériája gyűjti őket —, és a
 * választás később bármelyikre eshet, újabb rajzolás nélkül.
 *
 * Amit a szerver nem enged ki a kezéből: a prompt. Az a
 * `music-collection-badge-prompt.ts`-ben épül, a collection tárolt adataiból
 * — a kliens csak a uid-et küldi. Máskülönben egy hívó tetszőleges képet
 * rajzoltathatna a mi számlánkra.
 *
 * A képek oda kerülnek, ahová a borítók is: Storage-objektum, fölötte egy
 * `document` entitás, ami a nevét és a letöltési URL-jét adja. A definíció
 * csak hivatkozik rájuk — a galériában mindegyikre, a `badge.image`-ben
 * arra az egyre, amelyik a jelvény lett.
 */

import { randomUUID } from 'node:crypto';

import {
	DocumentReference,
	FieldValue,
	Firestore,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import objectHash from 'object-hash';
import { logger } from 'firebase-functions/v2';
import { HttpsError } from 'firebase-functions/v2/https';
import { ZsAiError } from '@zssz-soft/zs-ai-sdk';

import {
	APP_SETTING_COLLECTION,
	BADGE_SETTING_DOCUMENT,
	BadgeGenerationSettings,
	readBadgeSettings,
} from './badge-settings';
import { stamp, touchCatalog } from './catalog-sync';
import { GatewayClient } from './gateway-client';
import {
	BADGE_STYLE_VERSION,
	BadgePrompt,
	buildBadgePrompt,
	criterionList,
	styleNames,
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
/**
 * `libs/api` DocumentCategoryEnum.Badge. Amit a dokumentum-adminban kézzel
 * iktatnak be, annak nincs kategóriája; ami jelvénynek készült — rajzolva
 * vagy a szerkesztőből feltöltve —, az megmondja magáról, és az admin
 * felületen ez alapján áll külön listába a sok jelölt.
 */
const DOCUMENT_BADGE_CATEGORY = 'badge';
/** Az admin darabszámláló dokumentuma, amit a kliens is karbantart. */
const ENTITY_QUANTITY_COLLECTION = 'entity-quantity';
/** `catalog-sync`: a kliens-cache ezen a kulcson látja a változást. */
const FEATURE_KEYS = [MUSIC_COLLECTION_COLLECTION];
export interface GenerateBadgeResult {
	/** Amit ez a rajzolás tett a galériába, a rajzolás sorrendjében. */
	candidates: BadgeImage[];
	/** Amit a modell kapott — minden most rajzolt kép mellé ez kerül. */
	prompt: string;
	negativePrompt: string;
	seed: number;
	styleVersion: number;
	model: string;
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

/** Ennyi előadóig nézzük meg a stílusukat; ennél többet nem ér egy pin. */
const STYLE_LOOKUP_ARTIST_LIMIT = 5;
/** `libs/api` Artist: az előadó a saját stílusait hordozza. */
const ARTIST_COLLECTION = 'artist';

/**
 * A megnevezett előadók stílusai, ha a szabály maga egyet sem mond.
 *
 * Egy diszkográfia-collection („Iron Maiden on Vinyl") stílusról nem beszél,
 * mert nem kell neki: az előadó uid-je pontosabban jelöli ki a lemezeket,
 * mint bármelyik műfajnév. A pinnek viszont motívum kell, és az előadó
 * stílusát a katalógus így is tudja — innen már csak el kell olvasni.
 */
async function artistStyleNames(
	database: Firestore,
	artistUids: string[]
): Promise<string[]> {
	const looked = artistUids.slice(0, STYLE_LOOKUP_ARTIST_LIMIT);

	if (!looked.length) {
		return [];
	}

	const snapshots = await database.getAll(
		...looked.map((artistUid) =>
			database.collection(ARTIST_COLLECTION).doc(artistUid)
		)
	);

	return snapshots.flatMap((snapshot) => {
		const styles = snapshot.get('styles');

		return Array.isArray(styles) ? (styles as string[]) : [];
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
	const years = (criteria['years'] ?? {}) as Record<string, unknown>;
	const artistUids = criterionList(criteria['artists'], 'includesAny');
	const named = styleNames(criteria);
	const styles = named.length
		? named
		: await artistStyleNames(database, artistUids);
	const from =
		typeof years['from'] === 'number' ? (years['from'] as number) : null;
	const equals =
		typeof years['equals'] === 'number'
			? (years['equals'] as number)
			: null;

	return buildBadgePrompt(
		{
			styles,
			earliestYear: from ?? equals,
			points,
			isSingleArtist: artistUids.length === 1,
			slug: String(collection['slug'] ?? uid),
		},
		now
	);
}

/**
 * A rajzolás eredménye: a képek base64-ben, és az, amivel a gateway végül
 * megrajzoltatta őket. A modellt azért kérdezzük vissza, mert a jelölt mellé
 * feljegyezzük — a választás hónapokkal később is megmagyarázható kell
 * legyen, és a nevet már nem mi adjuk.
 */
interface DrawnImages {
	images: string[];
	model: string;
}

/**
 * Négyzetes kép: a badge mindig az. A gateway a méretet kéri, nem a képarányt
 * (`ImageInput.size`), ezért a prompt `aspectRatio`-ja itt oldódik fel.
 */
const BADGE_SIZE = '1024x1024';

/**
 * A jelöltek a gatewaytől. Egy kérés, `n` képpel: a gateway a szolgáltató
 * natív többes generálását használja, ahol van, és csak ott bont szét, ahol
 * nincs — ezt nekünk nem kell tudnunk.
 *
 * Ami a Vertex közvetlen hívásából nem él tovább: a `negativePrompt` a
 * prompt szövegébe olvad (a gateway képes bemenete nem ismeri külön), a
 * `seed` pedig már csak a feljegyzésben marad — a modellt nem vezeti,
 * vagyis ugyanaz a collection nem ugyanazt a pint önti újra.
 */
async function draw(
	client: GatewayClient,
	settings: BadgeGenerationSettings,
	built: BadgePrompt
): Promise<DrawnImages> {
	const prompt = `${built.prompt} Do not include: ${built.negativePrompt}.`;
	let result;

	try {
		result = await client.execute({
			capability: 'image.generate',
			input: {
				prompt,
				size: BADGE_SIZE,
				n: settings.candidateCount,
			},
			qualityProfile: settings.qualityProfile,
		});
	} catch (error) {
		// A gateway hibakódja többet mond, mint egy HTTP-státusz: a kvóta, a
		// jogosulatlan képesség és az elzárkózás más-más teendő.
		throw new HttpsError(
			'internal',
			error instanceof ZsAiError
				? `A gateway a képet nem rajzolta meg (${error.code}): ${error.message}`
				: `A gateway nem válaszolt: ${String(error)}`
		);
	}

	// A képgenerálás a gateway szinkron képessége; egy `accepted` válasz azt
	// jelentené, hogy a szerződés megváltozott alattunk.
	if (result.kind !== 'result') {
		throw new HttpsError(
			'internal',
			'A gateway a képet végrehajtásnak vette; a badge szinkron választ vár.'
		);
	}

	const images = await Promise.all(
		(result.output?.images ?? []).map((image) => inlineImage(image))
	);

	if (!images.length) {
		throw new HttpsError(
			'internal',
			'A gateway egyetlen képet sem adott vissza.'
		);
	}

	return { images, model: result.model ?? 'ismeretlen' };
}

/**
 * Egy kép base64-ben. A gateway vagy beágyazva adja (`b64`), vagy egy
 * letölthető címmel — a méretkorlát miatt az utóbbi a gyakoribb, ahogy a kép
 * nő.
 */
async function inlineImage(image: {
	readonly url?: string;
	readonly b64?: string;
}): Promise<string> {
	if (image.b64) {
		return image.b64;
	}

	if (!image.url) {
		throw new HttpsError(
			'internal',
			'A gateway képe se beágyazva, se címmel nem jött meg.'
		);
	}

	const response = await fetch(image.url);

	if (!response.ok) {
		throw new HttpsError(
			'internal',
			`A gateway képe nem tölthető le (${response.status}).`
		);
	}

	return Buffer.from(await response.arrayBuffer()).toString('base64');
}

/**
 * Jelöltek egy collectionhöz. A `points` a kliens feloldásából jön — csak a
 * perem gazdagságát mozdítja, a prompt szövegéhez nem fér hozzá —, ezért
 * elég józan határok közé szorítani.
 */
export async function generateBadgeCandidates(
	database: Firestore,
	client: GatewayClient,
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

	const { images, model } = await draw(client, settings, built);
	const drawn = await fileCandidates(
		database,
		database.collection(MUSIC_COLLECTION_COLLECTION).doc(uid),
		images,
		built,
		model,
		now
	);

	return {
		candidates: drawn,
		prompt: built.prompt,
		negativePrompt: built.negativePrompt,
		seed: built.seed,
		styleVersion: built.styleVersion,
		model,
	};
}

/**
 * Amit egy megrajzolt képről megőrzünk — mindegyikről, nem csak arról, ami
 * végül jelvény lesz. A fájl maga egy `document/{uid}` entitás alatt él —
 * onnan jön a neve és a letöltési URL-je —, az itteni mezők pedig azok,
 * amiknek a dokumentumban nincs helyük: ezek nélkül a badge nem állítható
 * elő újra.
 */
export interface BadgeImage {
	/** A `document` entitás, ami a fájlt körbeveszi. */
	documentUid: string;
	name: string;
	/** A kész letöltési URL, ahogy a borítóknál is — egyenesen `<img src>`-be. */
	filePath: string;
	/**
	 * Honnan jött a kép. A mező hiánya a rajzolt: a galériák tele vannak
	 * olyan bejegyzésekkel, amelyek még azelőtt készültek, hogy feltölteni
	 * lehetett volna.
	 */
	source?: 'drawn' | 'uploaded';
	/**
	 * Amivel a modell rajzolta. Csak a rajzolt képnek van ilyenje: egy
	 * kézzel feltöltött pinnek nincs mit újra előállítani.
	 */
	prompt?: string;
	negativePrompt?: string;
	seed?: number;
	styleVersion?: number;
	model?: string;
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
 * A megrajzolt képek fájlba tétele: mindegyikből Storage-objektum, fölé egy
 * dokumentum, és a definíció galériájának a végére egy bejegyzés. A feltöltés
 * párhuzamos, az írás viszont egyetlen tranzakció, hogy a katalógus soha ne
 * lásson félig megérkezett sorozatot.
 *
 * Ez az a pont, ahol a jelölt többé nem múlik el: a választás ezután már
 * csak a galéria egyik darabjára mutat.
 */
async function fileCandidates(
	database: Firestore,
	reference: DocumentReference,
	images: string[],
	built: BadgePrompt,
	model: string,
	now: number
): Promise<BadgeImage[]> {
	const snapshot = await reference.get();

	if (!snapshot.exists) {
		throw new HttpsError('not-found', 'Nincs ilyen collection.');
	}

	const collectionName = String(snapshot.get('name') ?? reference.id);
	const slug = String(snapshot.get('slug') ?? reference.id);
	const uploads = await Promise.all(
		images.map(async (image, index) => {
			const bytes = Buffer.from(image, 'base64');

			if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
				throw new HttpsError(
					'internal',
					'A képmodell érvénytelen méretű képet adott.'
				);
			}

			// A név hordozza a sorszámot is: a tárolási útvonal a név hashe,
			// így egy sorozat négy képe négy külön objektum lesz.
			const originalName =
				`${slug}-badge-v${built.styleVersion}-${now}-` +
				`${index + 1}.png`;
			const uploaded = await uploadDocumentFile(bytes, originalName);

			return {
				...uploaded,
				originalName,
				name: `Badge — ${collectionName} #${index + 1}`,
				documentReference: database
					.collection(DOCUMENT_COLLECTION)
					.doc(),
			};
		})
	);
	const drawn: BadgeImage[] = uploads.map((upload) => ({
		documentUid: upload.documentReference.id,
		name: upload.name,
		filePath: upload.filePath,
		prompt: built.prompt,
		negativePrompt: built.negativePrompt,
		seed: built.seed,
		styleVersion: built.styleVersion,
		model,
		generatedAt: now,
	}));

	await database.runTransaction(async (transaction) => {
		// A galériát a tranzakción belül olvassuk: két egyszerre futó
		// rajzolás közül így egyik sem írja felül a másik jelöltjeit.
		const fresh = await transaction.get(reference);
		const badge = (fresh.data()?.['badge'] ?? {}) as Record<
			string,
			unknown
		>;
		const gallery = Array.isArray(badge['gallery'])
			? (badge['gallery'] as BadgeImage[])
			: [];

		uploads.forEach((upload) => {
			// A fájl fölötti dokumentum: innentől a katalógus tud róla, és
			// itt lehet metaadattal körülvenni.
			transaction.set(
				upload.documentReference,
				stamp({
					uid: upload.documentReference.id,
					entityType: DOCUMENT_ENTITY_TYPE,
					category: DOCUMENT_BADGE_CATEGORY,
					name: upload.name,
					originalName: upload.originalName,
					fileType: 'image/png',
					filePath: upload.filePath,
					createdAt: now,
				})
			);
		});

		// Az admin darabszám, amit egyébként a kliens léptet.
		transaction.set(
			database
				.collection(ENTITY_QUANTITY_COLLECTION)
				.doc(DOCUMENT_ENTITY_TYPE),
			{
				type: DOCUMENT_ENTITY_TYPE,
				quantity: FieldValue.increment(drawn.length),
				modifyDate: new Date(now),
			},
			{ merge: true }
		);
		transaction.set(
			reference,
			stamp({ badge: { ...badge, gallery: [...gallery, ...drawn] } }),
			{ merge: true }
		);
		touchCatalog(database, transaction, [
			MUSIC_COLLECTION_COLLECTION,
			DOCUMENT_COLLECTION,
		]);
	});

	logger.info(
		`badge-jelöltek mentve: ${reference.id} → ` +
			uploads.map((upload) => upload.storagePath).join(', ')
	);

	return drawn;
}

/**
 * A választott kép befagyasztása a definícióba. Fájl már nem készül: a kép a
 * rajzolás óta megvan, ez a hívás csak azt mondja meg, a galéria melyik
 * darabja a jelvény — így egy hónapja rajzolt jelöltre is eshet a választás.
 *
 * Üres azonosító a pin levétele: a jelvény képe ilyenkor a kézzel feltöltött
 * grafikára esik vissza. A galéria marad, ahol van, így a levett pin bármikor
 * visszaválasztható.
 */
export async function setBadgeImage(
	database: Firestore,
	uid: unknown,
	documentUid: unknown
): Promise<{ uid: string; documentUid: string | null }> {
	if (typeof uid !== 'string' || !uid.trim()) {
		throw new HttpsError('invalid-argument', 'Hiányzó uid.');
	}

	if (
		documentUid !== null &&
		documentUid !== undefined &&
		typeof documentUid !== 'string'
	) {
		throw new HttpsError('invalid-argument', 'Hiányzik a kép azonosítója.');
	}

	const collectionUid = uid.trim();
	const pickedUid = typeof documentUid === 'string' ? documentUid.trim() : '';
	const reference = database
		.collection(MUSIC_COLLECTION_COLLECTION)
		.doc(collectionUid);

	await database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(reference);

		if (!snapshot.exists) {
			throw new HttpsError('not-found', 'Nincs ilyen collection.');
		}

		const badge = (snapshot.data()?.['badge'] ?? {}) as Record<
			string,
			unknown
		>;
		const gallery = Array.isArray(badge['gallery'])
			? (badge['gallery'] as BadgeImage[])
			: [];
		// A kép csak a saját collectionje galériájából jöhet: a kliens nem
		// mutathat rá egy másik collection badge-ére, sem bármi másra.
		const picked = pickedUid
			? gallery.find((image) => image?.documentUid === pickedUid)
			: null;

		if (pickedUid && !picked) {
			throw new HttpsError(
				'not-found',
				'Ez a kép nincs a collection galériájában.'
			);
		}

		transaction.set(
			reference,
			stamp({ badge: { ...badge, image: picked ?? null } }),
			{ merge: true }
		);
		touchCatalog(database, transaction, [MUSIC_COLLECTION_COLLECTION]);
	});

	logger.info(
		pickedUid
			? `badge kiválasztva: ${collectionUid} → document/${pickedUid}`
			: `badge pin levéve: ${collectionUid}`
	);

	return { uid: collectionUid, documentUid: pickedUid || null };
}

/** Amit a kliens a `document/` mappába tölthet (`storage.rules`). */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * A feltöltött fájl letöltési URL-je és típusa. A kliens SDK
 * `getDownloadURL`-je már tokent tesz az objektumra; ha mégsem volna rajta,
 * itt kap egyet — így a `filePath` ugyanolyan alakú, mint a rajzolt pineké.
 */
async function uploadedDocumentFile(
	storagePath: string
): Promise<{ filePath: string; contentType: string }> {
	const bucket = getStorage().bucket();
	const file = bucket.file(storagePath);
	const [exists] = await file.exists();

	if (!exists) {
		throw new HttpsError('not-found', 'Nincs ilyen feltöltött fájl.');
	}

	const [metadata] = await file.getMetadata();
	const contentType = String(metadata.contentType ?? '');

	if (!contentType.startsWith('image/')) {
		throw new HttpsError('invalid-argument', 'A feltöltött fájl nem kép.');
	}

	if (Number(metadata.size ?? 0) > MAX_UPLOAD_BYTES) {
		throw new HttpsError('invalid-argument', 'A kép nagyobb 5 MB-nál.');
	}

	const tokens = String(
		metadata.metadata?.['firebaseStorageDownloadTokens'] ?? ''
	)
		.split(',')
		.filter(Boolean);
	const token = tokens[0] ?? randomUUID();

	if (!tokens.length) {
		await file.setMetadata({
			metadata: { firebaseStorageDownloadTokens: token },
		});
	}

	return {
		contentType,
		filePath:
			`https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
			`/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`,
	};
}

/**
 * A kézzel feltöltött kép beiktatása. A fájl ilyenkor már a Storage-ban van
 * — a szerkesztő tölti fel, abba a `document/` mappába, ahová a rajzolt
 * pinek is kerülnek —, és itt kap fölé dokumentumot, galéria-bejegyzést, és
 * egyből ez lesz a jelvény.
 *
 * Miért a szerveren: a `music-collection` dokumentumra a rules egyetlen
 * kliens-írást sem enged, a galéria tehát csak innen bővülhet.
 *
 * És miért lesz egyből pin: a rajzolt jelöltek közül azért választ az admin,
 * mert a modell rajzolt négyet helyette — a feltöltött képet viszont ő maga
 * hozta, épp azért, hogy az legyen a jelvény. Levenni ugyanúgy lehet, és a
 * galériában marad, mint bármelyik rajzolt kép.
 */
export async function adoptBadgeImage(
	database: Firestore,
	uid: unknown,
	storagePath: unknown,
	fileName: unknown,
	now: number
): Promise<BadgeImage> {
	if (typeof uid !== 'string' || !uid.trim()) {
		throw new HttpsError('invalid-argument', 'Hiányzó uid.');
	}

	if (typeof storagePath !== 'string' || !storagePath.trim()) {
		throw new HttpsError('invalid-argument', 'Hiányzik a fájl útvonala.');
	}

	const folder = DOCUMENT_FOLDER.replace(/^\//, '');
	const path = storagePath.trim().replace(/^\//, '');

	// Csak a dokumentum-mappából: a hívó nem mutathat rá a bucket bármelyik
	// objektumára, és nem iktathat dokumentum mögé rejtve mást.
	if (!path.startsWith(folder) || path.includes('..')) {
		throw new HttpsError(
			'invalid-argument',
			'A kép nem a dokumentum-mappában van.'
		);
	}

	const collectionUid = uid.trim();
	const reference = database
		.collection(MUSIC_COLLECTION_COLLECTION)
		.doc(collectionUid);
	const snapshot = await reference.get();

	if (!snapshot.exists) {
		throw new HttpsError('not-found', 'Nincs ilyen collection.');
	}

	const { filePath, contentType } = await uploadedDocumentFile(path);
	const collectionName = String(snapshot.get('name') ?? reference.id);
	const documentReference = database.collection(DOCUMENT_COLLECTION).doc();
	const originalName =
		typeof fileName === 'string' && fileName.trim()
			? fileName.trim().slice(0, 200)
			: (path.split('/').pop() ?? 'badge');

	return database.runTransaction(async (transaction) => {
		const fresh = await transaction.get(reference);
		const badge = (fresh.data()?.['badge'] ?? {}) as Record<
			string,
			unknown
		>;
		const gallery = Array.isArray(badge['gallery'])
			? (badge['gallery'] as BadgeImage[])
			: [];
		// Ugyanazt a fájlt kétszer nem iktatjuk be: a második hívás a már
		// meglévő bejegyzést teszi jelvénnyé, új dokumentum nélkül.
		const already = gallery.find((image) => image?.filePath === filePath);

		if (already) {
			transaction.set(
				reference,
				stamp({ badge: { ...badge, image: already } }),
				{ merge: true }
			);
			touchCatalog(database, transaction, FEATURE_KEYS);
			logger.info(
				`feltöltött badge újra jelvény: ${collectionUid} → ` +
					`document/${already.documentUid}`
			);

			return already;
		}

		const adopted: BadgeImage = {
			documentUid: documentReference.id,
			name: `Badge — ${collectionName} (feltöltött)`,
			filePath,
			source: 'uploaded',
			generatedAt: now,
		};

		transaction.set(
			documentReference,
			stamp({
				uid: documentReference.id,
				entityType: DOCUMENT_ENTITY_TYPE,
				category: DOCUMENT_BADGE_CATEGORY,
				name: adopted.name,
				originalName,
				fileType: contentType,
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
		transaction.set(
			reference,
			stamp({
				badge: {
					...badge,
					image: adopted,
					gallery: [...gallery, adopted],
				},
			}),
			{ merge: true }
		);
		touchCatalog(database, transaction, [
			MUSIC_COLLECTION_COLLECTION,
			DOCUMENT_COLLECTION,
		]);
		logger.info(
			`feltöltött badge beiktatva: ${collectionUid} → ` +
				`document/${adopted.documentUid} (${path})`
		);

		return adopted;
	});
}
