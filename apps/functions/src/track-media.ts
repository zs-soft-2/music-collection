/**
 * A zeneszám képei és rövid videója, az AI-gatewayen át.
 *
 * Mindkettő a DAL SZÖVEGÉBŐL indul. Nem a szöveg megy ki a képmodellnek —
 * egy prompt ezer karakternyi, egy dal hosszabb, és a szó szerinti versszak
 * nem a miénk —, hanem az, amit látni lehet belőle: a hely, a tárgy, az
 * időjárás, a fény. Ezt egy olcsó szöveges hívás szedi ki, és ez a jelenet
 * megy tovább. Szöveg nélküli számnál marad a cím és a hívó iránya.
 *
 * Kép: a jelenet + a stíluszár egy `image.generate` hívásba. A modellt a
 * hívó választhatja — a gateway katalógusából, nem egy itt bedrótozott
 * listából —, mert az, hogy ez a tenant mihez jogosult, az appon kívül
 * változik.
 *
 * Videó: ugyanebből a szövegből. A gateway videó-képessége
 * (`video.scene.generate`) promptot kap, képet nem — a kész képeket tehát
 * hiába adnánk oda. Egy képolvasó hívás meg pont azt a kört futná körbe,
 * amit a kép már megjárt: a szavakból lett a kép, abból megint szavak. Az
 * első hívás ezért a dalszövegből ír egy jelenetet ÉS egy kameramozgást,
 * a második ebből készíti a klipet. Így a klipnek szöveg kell, nem kép.
 *
 * Mindkettő fájlja úgy kerül be, ahogy a katalógus minden képe: objektum a
 * `document/` mappába, fölé dokumentum (`document-file.ts`), a saját
 * kategóriájával — a kép `track-image`, a klip `track-clip`. Enélkül a fájl
 * ott hever a bucketben, és sem a dokumentum-admin, sem a következő
 * szerkesztő nem tud róla.
 *
 * Amit a szerver nem ad ki a kezéből: a prompt. A hívó a szám uid-jét küldi,
 * a modellt, és legfeljebb egy rövid irányt — különben bárki tetszőleges
 * képet rendelhetne a mi számlánkra. A stíluszár kódban marad, verziózva.
 *
 * Miért nem vár meg semmit a videó. A gatewaynél execution: a `start` egy
 * azonosítóval tér vissza, a kész fájl percekkel később lesz meg. A kliens
 * ezért a `status` hívással kérdez vissza, és ugyanaz a hívás teszi el a
 * fájlt, amikor megérkezett — nincs webhook, nincs ütemező, és egy becsukott
 * böngésző sem veszít el semmit: a munka a gatewaynél fut, a félbehagyott
 * klipet a következő megnyitás fejezi be.
 */

import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

import { stamp, touchCatalog } from './catalog-sync';
import {
	DOCUMENT_COLLECTION,
	DOCUMENT_ENTITY_TYPE,
	uploadDocumentFile,
	writeDocument,
} from './document-file';
import { GatewayArtifact, GatewayClient } from './gateway-client';

const TRACK_COLLECTION = 'track';
/** A dalszöveg külön dokumentumban él, mert nem publikus. */
const TRACK_LYRICS_COLLECTION = 'track-lyrics';
/** A futó és a lefutott klip-generálások, számonként egy dokumentum. */
export const TRACK_CLIP_COLLECTION = 'track-clip';
const APP_SETTING_COLLECTION = 'app-setting';
const TRACK_MEDIA_SETTING_DOCUMENT = 'track-media';
/** `libs/api` DocumentCategoryEnum.TrackImage. */
const TRACK_IMAGE_CATEGORY = 'track-image';
/** `libs/api` DocumentCategoryEnum.TrackClip — a videó, nem kép. */
const TRACK_CLIP_CATEGORY = 'track-clip';
/** A kliens-cache ezeken a kulcsokon látja meg, hogy lett új média. */
const FEATURE_KEYS = [TRACK_COLLECTION, DOCUMENT_COLLECTION];

/** A klip hossza másodpercben. A gateway nyolcat feltételez, ha nem szólunk. */
const CLIP_SECONDS = 8;
const ASPECT_RATIO = '16:9';
/**
 * A stíluszár: ettől hasonlít egymásra a számok összes képe és klipje, és
 * ettől illik a lejátszó színpadához. Kódban marad és verziózva — a tárolt
 * promptból utólag is kiderül, melyik zárral készült.
 */
export const MEDIA_STYLE_VERSION = 1;
const STYLE_LOCK =
	'Cinematic analogue music-video look: 35mm grain, soft halation, ' +
	'deep shadows, no text, no captions, no watermark, no faces speaking, ' +
	'one continuous shot that can loop seamlessly.';
const IMAGE_STYLE_LOCK =
	'Cinematic analogue album-art look: 35mm grain, soft halation, deep ' +
	'shadows, rich colour, no text, no captions, no watermark, no logos.';
/** Amit a videóban semmiképp nem akarunk látni. */
const NEGATIVE_PROMPT =
	'text, caption, subtitles, watermark, logo, distorted faces, extra limbs, ' +
	'flicker, harsh strobing';

/** Ennél hosszabb promptot nem adunk tovább; a modell se kér többet. */
const MAX_PROMPT_CHARS = 1200;
/** Ennyi irányt fogadunk el a hívótól. A prompt többi része a miénk. */
const MAX_HINT_CHARS = 200;
/**
 * A letöltött fájl felső határa. A memórián át kerül a bucketbe, a function
 * pedig 512 MiB-on fut; egy nyolc másodperces klip néhány MB, tehát ez a
 * határ nem a klipről szól, hanem arról, hogy egy elszabadult válasz ne
 * vigye el a példányt.
 */
const MAX_FILE_BYTES = 40 * 1024 * 1024;
/**
 * Ennyi dalszöveget adunk oda a jelenetíró modellnek. Egy dal ennél
 * majdnem mindig rövidebb; a határ a végtelen ismétlődő refrén ellen van.
 */
const MAX_LYRICS_CHARS = 4000;

/**
 * A hiba, amit a callable fordít `HttpsError`-rá (`index.ts`), mint a fotós
 * kereté. A modul így a firebase-functions burka nélkül tesztelhető.
 */
export class TrackMediaError extends Error {
	public constructor(
		message: string,
		public readonly reason:
			'not-found' | 'no-lyrics' | 'running' | 'quota' | 'gateway'
	) {
		super(message);
		this.name = 'TrackMediaError';
	}
}

export type TrackClipStatus =
	'none' | 'queued' | 'running' | 'succeeded' | 'failed';

/** Egy kép a számon, ahogy a track-dokumentum tárolja. */
export interface TrackImage {
	/** `libs/common/api` EntityTypeEnum.Document. */
	entityType: string;
	uid: string;
	name: string;
	filePath: string;
	category?: string;
	width?: number | null;
	height?: number | null;
	generated?: boolean;
}

/**
 * A kész klip, ahogy a szám dokumentuma hordozza. Ugyanaz a burok, mint egy
 * képé (`TrackImage`), csak a saját kategóriájával: a videó nem kép, de
 * ugyanúgy fájl, amit meg kell találni — a dokumentum-admin a `track-clip`
 * alatt listázza, és semmink nem mutat egy beiktatatlan bucket-útra.
 */
export interface TrackClip {
	/** `libs/common/api` EntityTypeEnum.Document. */
	entityType: string;
	/** A dokumentum uid-je — ezen találni meg újra. */
	uid: string;
	name: string;
	filePath: string;
	category: string;
	durationSeconds: number | null;
	mimeType: string | null;
	executionId: string;
	model: string | null;
	prompt: string;
	createdAt: number;
}

export interface TrackClipState {
	status: TrackClipStatus;
	executionId: string | null;
	prompt: string | null;
	error: string | null;
	clip: TrackClip | null;
	remainingToday: number | null;
}

export interface TrackClipEstimate {
	costUsd: number | null;
	currency: string;
	model: string | null;
	remainingToday: number;
}

export interface TrackImageModel {
	id: string;
	provider: string | null;
	label: string;
}

export interface TrackImageResult {
	image: TrackImage;
	prompt: string;
	model: string | null;
	remainingToday: number;
}

/**
 * A gateway ársávja. Az `undefined` nem hiányzó adat, hanem a harmadik
 * válasz: a hívó nem köti meg a sávot, a gateway a sajátját választja. Egy
 * kitalált alapértelmezés itt nem olcsóbb hívás lenne, hanem semmilyen — a
 * profil-router 409-cel áll meg azon a sávon, amihez nincs modell rendelve.
 */
type QualityProfile = 'economy' | 'normal' | 'premium';

/** A kérés sáv-mezője, ha a hívó kért egyet; különben semmi. */
export function profileOf(
	quality: QualityProfile | undefined
): { qualityProfile: QualityProfile } | Record<string, never> {
	return quality ? { qualityProfile: quality } : {};
}

/**
 * Honnan vesszük a kész képet. A gateway vagy beágyazva adja (`b64`), vagy
 * egy letölthető címmel — ahol mindkettő megjön, a cím élvez elsőbbséget: az
 * a letárolt, egész fájlra mutat, a beágyazott példánynak viszont bele kell
 * férnie a válaszba, és ahogy a kép nő, a gateway már csak címet ad. Egy
 * letöltéssel drágább, cserébe azt a fájlt iktatjuk, amit a modell rajzolt.
 */
export function imageSource(
	drawn: { readonly url?: string; readonly b64?: string } | undefined
): { url: string } | { b64: string } | null {
	if (drawn?.url) {
		return { url: drawn.url };
	}

	if (drawn?.b64) {
		return { b64: drawn.b64 };
	}

	return null;
}

export interface Song {
	uid: string;
	name: string;
	albumUid: string | null;
	images: TrackImage[];
}

// ── A napi keret ────────────────────────────────────────────────────────────

/**
 * A videó a legdrágább hívásunk — nagyságrenddel drágább egy képnél —, ezért
 * két külön keret van, és mindkettő naponta fordul. A minta a fotós keretté:
 * a számláló a limit mellett, ugyanabban a dokumentumban, és a levonás a
 * modell hívása ELŐTT történik.
 */
export interface TrackMediaQuota {
	enabled: boolean;
	dailyClipLimit: number;
	dailyImageLimit: number;
}

export const DEFAULT_TRACK_MEDIA_QUOTA: TrackMediaQuota = {
	enabled: true,
	dailyClipLimit: 3,
	dailyImageLimit: 20,
};

const MAX_DAILY_CLIP_LIMIT = 50;
const MAX_DAILY_IMAGE_LIMIT = 500;

const counted = (value: unknown): number =>
	typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;

const bounded = (value: unknown, fallback: number, max: number): number =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0
		? Math.min(Math.floor(value), max)
		: fallback;

export function sanitizeTrackMediaQuota(data: unknown): TrackMediaQuota {
	const input = (data ?? {}) as Partial<TrackMediaQuota>;

	return {
		enabled: input.enabled !== false,
		dailyClipLimit: bounded(
			input.dailyClipLimit,
			DEFAULT_TRACK_MEDIA_QUOTA.dailyClipLimit,
			MAX_DAILY_CLIP_LIMIT
		),
		dailyImageLimit: bounded(
			input.dailyImageLimit,
			DEFAULT_TRACK_MEDIA_QUOTA.dailyImageLimit,
			MAX_DAILY_IMAGE_LIMIT
		),
	};
}

/** A nap kulcsa UTC szerint; a keret napi, nem percre pontos dolog. */
const dayOf = (now: number): string => new Date(now).toISOString().slice(0, 10);

type Kind = 'clip' | 'image';

const limitOf = (quota: TrackMediaQuota, kind: Kind): number =>
	kind === 'clip' ? quota.dailyClipLimit : quota.dailyImageLimit;

const countField = (kind: Kind): string =>
	kind === 'clip' ? 'clipCount' : 'imageCount';

/**
 * Egy darab levonása a mai keretből. Hiba, ha nincs benne — a hívó ezt
 * `resource-exhausted`-ként adja tovább.
 */
async function reserve(
	database: Firestore,
	kind: Kind,
	now: number
): Promise<number> {
	const day = dayOf(now);
	const reference = database
		.collection(APP_SETTING_COLLECTION)
		.doc(TRACK_MEDIA_SETTING_DOCUMENT);

	return database.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(reference);
		const stored = snapshot.data() ?? {};
		const quota = sanitizeTrackMediaQuota(stored);

		if (!quota.enabled) {
			throw new TrackMediaError(
				'A generálás most ki van kapcsolva.',
				'quota'
			);
		}

		const limit = limitOf(quota, kind);
		const used =
			stored['usageDay'] === day ? counted(stored[countField(kind)]) : 0;

		if (used + 1 > limit) {
			throw new TrackMediaError(
				kind === 'clip'
					? `A mai videó-keret elfogyott (${limit} klip). Holnap újra indul.`
					: `A mai kép-keret elfogyott (${limit} kép). Holnap újra indul.`,
				'quota'
			);
		}

		// A nap fordulásakor mindkét számláló nulláról indul; a másikat is
		// ki kell írni, különben a tegnapi szám élne tovább mellette.
		const other: Kind = kind === 'clip' ? 'image' : 'clip';
		const otherUsed =
			stored['usageDay'] === day ? counted(stored[countField(other)]) : 0;

		transaction.set(
			reference,
			{
				usageDay: day,
				[countField(kind)]: used + 1,
				[countField(other)]: otherUsed,
			},
			{ merge: true }
		);

		return limit - used - 1;
	});
}

/** Ami a mai keretből megvan, levonás nélkül — a becsléshez. */
async function remaining(
	database: Firestore,
	kind: Kind,
	now: number
): Promise<number> {
	const snapshot = await database
		.collection(APP_SETTING_COLLECTION)
		.doc(TRACK_MEDIA_SETTING_DOCUMENT)
		.get();
	const stored = snapshot.data() ?? {};
	const quota = sanitizeTrackMediaQuota(stored);
	const used =
		stored['usageDay'] === dayOf(now)
			? counted(stored[countField(kind)])
			: 0;

	return quota.enabled ? Math.max(limitOf(quota, kind) - used, 0) : 0;
}

// ── A szám és a képei ───────────────────────────────────────────────────────

async function readSong(database: Firestore, trackUid: string): Promise<Song> {
	const uid = String(trackUid ?? '').trim();

	if (!uid) {
		throw new TrackMediaError('Hiányzó szám-azonosító.', 'not-found');
	}

	const snapshot = await database.collection(TRACK_COLLECTION).doc(uid).get();

	if (!snapshot.exists) {
		throw new TrackMediaError('Ez a szám nincs meg.', 'not-found');
	}

	const images = (snapshot.get('images') as TrackImage[] | undefined) ?? [];

	return {
		uid,
		name: (snapshot.get('name') as string) ?? '',
		albumUid: (snapshot.get('albumUid') as string) ?? null,
		images: images.filter((image) => typeof image?.filePath === 'string'),
	};
}

/**
 * A szám szövege, ha van. A dalszöveg nem publikus (`track-lyrics`), de ezt
 * a szerver olvassa Admin SDK-val — és nem adja tovább sehová: a modellnek
 * az megy, amit a szövegből LÁTNI lehet, nem a szöveg maga.
 */
export async function readLyrics(
	database: Firestore,
	trackUid: string
): Promise<string> {
	const snapshot = await database
		.collection(TRACK_LYRICS_COLLECTION)
		.doc(trackUid)
		.get();

	return trimLyrics(snapshot.get('text'));
}

/**
 * A szöveg, amire a klipnek szüksége van — enélkül nem indul.
 *
 * A kép elmegy a cím alapján is, egy nyolc másodperces videó viszont a
 * legdrágább hívásunk: amiből nincs mit megírni, azt ne is rendeljük meg.
 */
async function requireLyrics(database: Firestore, song: Song): Promise<string> {
	const lyrics = await readLyrics(database, song.uid);

	if (!lyrics) {
		throw new TrackMediaError(
			'Ehhez a számhoz még nincs dalszöveg, amiből videó készülhetne.',
			'no-lyrics'
		);
	}

	return lyrics;
}

/** A szöveg, amennyi a jelenetíró modellnek elég. */
export function trimLyrics(text: unknown): string {
	return String(text ?? '')
		.replace(/\r\n/g, '\n')
		.trim()
		.slice(0, MAX_LYRICS_CHARS);
}

/** Amit a hívó irányként küldhet: rövid, egysoros, vezérlőkarakter nélkül. */
export function cleanHint(hint: unknown): string {
	return String(hint ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_HINT_CHARS);
}

// ── Kép rajzolása ───────────────────────────────────────────────────────────

/**
 * Amivel ez a tenant rajzolhat. A gateway katalógusából, mert az, hogy mihez
 * van joga, az appon kívül változik: egy ide bedrótozott lista olyan modellt
 * kínálna, amit senki nem tud meghívni.
 */
export async function listImageModels(
	client: GatewayClient
): Promise<TrackImageModel[]> {
	const models = await client.listModels({ capability: 'image.generate' });

	return models.map((model) => ({
		id: model.id,
		provider: model.provider ?? null,
		label: model.provider ? `${model.id} · ${model.provider}` : model.id,
	}));
}

const IMAGE_SCENE_SCHEMA = {
	name: 'track_image_scene',
	schema: {
		type: 'object',
		additionalProperties: false,
		required: ['scene', 'palette'],
		properties: {
			scene: {
				type: 'string',
				description:
					'One still image the lyrics call up: what is in the frame, where, in what light. Built from the images the words themselves use.',
			},
			palette: {
				type: 'string',
				description:
					'The colours and the light of that image, in a few words.',
			},
		},
	},
} as const;

/**
 * A dal szövegéből egy látvány.
 *
 * Miért nem megy a dalszöveg egy az egyben a képmodellnek: egy prompt ezer
 * karakternyi, egy dal ennél hosszabb, a szolgáltatók pedig a szó szerinti
 * versszakot gyakran vissza is utasítják — és nem is a mi szövegünk. A képet
 * az adja, amit a szövegből LÁTNI lehet: a hely, a tárgy, az időjárás, a
 * fény. Ez a lépés pont azt szedi ki belőle.
 *
 * Szöveg nélküli számnál nincs mit kiszedni: marad a cím és az irány.
 *
 * Minőségi profilt nem kér: a gateway tenantjánál a szöveges képességhez nem
 * minden sávban áll modell, és ez a négyszáz tokenes lépés amúgy sem a
 * költség — azt a mellette futó kép viszi. A modellt a gateway választja, ahogy
 * a többi szöveges hívásunknál is.
 */
export async function writeImageScene(
	client: GatewayClient,
	song: Song,
	lyrics: string,
	hint: string
): Promise<{ scene: string; palette: string }> {
	if (!lyrics) {
		return { scene: '', palette: '' };
	}

	// A gateway a megtagadott hívást kivétellel jelzi, nem `kind`-dal — egy
	// szöveges modellhez nem jogosult tenant (`MODEL_NOT_ENTITLED`) így az
	// egész rajzolást vitte, holott a kép e lépés nélkül is elkészülhet.
	const result = await client
		.execute({
			capability: 'text.complete',
			input: {
				prompt:
					`Below are the lyrics of the song "${song.name}". Read them ` +
					'and describe ONE still image the words call up: what is in ' +
					'the frame, where it is, in what light and weather. Take the ' +
					'imagery from the words themselves — a line naming a place, ' +
					'an object or a sky is worth more than a summary of the ' +
					'meaning. Never quote a line, and never put writing in the ' +
					'picture.' +
					(hint ? ` Lean towards: ${hint}.` : '') +
					`\n\n${lyrics}`,
				systemPrompt:
					'You write briefs for an image model. You are precise, ' +
					'visual and short, and you never quote song lyrics.',
				responseSchema: IMAGE_SCENE_SCHEMA,
				maxTokens: 400,
			},
			context: { sceneType: 'track-image', templateId: song.uid },
		})
		.catch((error: unknown) => {
			logger.warn(
				'A dalszöveg elolvasása elszállt, cím alapján rajzolunk',
				error
			);
			return undefined;
		});

	if (!result || result.kind !== 'result' || !result.output?.text) {
		// A szöveg elolvasása nem sikerült — a rajzolás ettől még mehet a cím
		// és az irány alapján. Egy hiba itt ne vigye el az egész gombot.
		return { scene: '', palette: '' };
	}

	try {
		const parsed = JSON.parse(result.output.text) as {
			scene?: string;
			palette?: string;
		};

		return {
			scene: String(parsed.scene ?? '').trim(),
			palette: String(parsed.palette ?? '').trim(),
		};
	} catch {
		return { scene: result.output.text.trim(), palette: '' };
	}
}

/**
 * A rajzolás prompja: ami a dal szövegéből látszik, a hívó iránya, és a zár.
 * Vágva. A cím akkor is ott van, amikor a szövegből nem lett jelenet.
 */
export function buildImagePrompt(
	song: Song,
	scene: string,
	palette: string,
	hint: string
): string {
	return [
		scene || `Album art for the song "${song.name}".`,
		palette,
		hint,
		IMAGE_STYLE_LOCK,
	]
		.filter(Boolean)
		.join(' ')
		.slice(0, MAX_PROMPT_CHARS);
}

/**
 * Rajzol egy képet a számhoz, és iktatja: fájl a `document/` mappába, fölé
 * dokumentum. A szám `images` listájához a kliens teszi hozzá — ő tudja,
 * milyen sorrendben állnak.
 */
export async function drawTrackImage(
	database: Firestore,
	client: GatewayClient,
	trackUid: string,
	options: { model?: string; hint?: unknown; quality?: QualityProfile },
	now: number
): Promise<TrackImageResult> {
	const song = await readSong(database, trackUid);
	const left = await reserve(database, 'image', now);
	const hint = cleanHint(options.hint);
	// A kép a dal szövegéből indul: előbb az, ami látszik belőle, aztán a
	// rajzolás. Két hívás egy kép helyett — a szöveges lépés a töredéke a
	// képének, és nélküle minden szám ugyanarról a címről kapna képet.
	const lyrics = await readLyrics(database, song.uid);
	const { scene, palette } = await writeImageScene(
		client,
		song,
		lyrics,
		hint
	);
	const prompt = buildImagePrompt(song, scene, palette, hint);
	const result = await client.execute({
		capability: 'image.generate',
		...profileOf(options.quality),
		input: {
			prompt,
			...(options.model ? { model: options.model } : {}),
			n: 1,
		},
		context: { sceneType: 'track-image', templateId: song.uid },
	});

	if (result.kind !== 'result') {
		throw new TrackMediaError('A képmodell nem adott képet.', 'gateway');
	}

	const drawn = result.output?.images?.[0];
	const source = imageSource(drawn);
	const bytes = !source
		? null
		: 'url' in source
			? await download(source.url)
			: Buffer.from(source.b64, 'base64');

	if (!bytes?.length) {
		throw new TrackMediaError('A képmodell üres képet adott.', 'gateway');
	}

	const mimeType = drawn?.mimeType ?? 'image/png';
	const extension = mimeType.split('/').pop() ?? 'png';
	const originalName = `${song.uid}-image-${now}.${extension}`;
	const uploaded = await uploadDocumentFile(bytes, originalName, mimeType);
	const documentUid = database.collection(DOCUMENT_COLLECTION).doc().id;
	const name = `${song.name} — kép`;

	await database.runTransaction(async (transaction) => {
		writeDocument(
			database,
			transaction,
			{
				uid: documentUid,
				name,
				originalName,
				fileType: uploaded.contentType,
				filePath: uploaded.filePath,
				category: TRACK_IMAGE_CATEGORY,
			},
			now
		);
		touchCatalog(database, transaction, [DOCUMENT_COLLECTION]);
	});

	logger.info(`szám-kép rajzolva: ${song.uid} → ${uploaded.storagePath}`);

	return {
		image: {
			entityType: DOCUMENT_ENTITY_TYPE,
			uid: documentUid,
			name,
			filePath: uploaded.filePath,
			category: TRACK_IMAGE_CATEGORY,
			width: null,
			height: null,
			generated: true,
		},
		prompt,
		model: result.model ?? options.model ?? null,
		remainingToday: left,
	};
}

// ── A klip prompja ──────────────────────────────────────────────────────────

const SCENE_SCHEMA = {
	name: 'track_clip_scene',
	schema: {
		type: 'object',
		additionalProperties: false,
		required: ['scene', 'motion'],
		properties: {
			scene: {
				type: 'string',
				description:
					'What the lyrics call up, as one sentence a video model can build: subject, place, light, mood.',
			},
			motion: {
				type: 'string',
				description:
					'One slow camera or subject movement that suits the scene, e.g. "a slow push in through drifting smoke".',
			},
		},
	},
} as const;

/**
 * A klip jelenete, a dal szövegéből — ugyanonnan, ahonnan a kép.
 *
 * Képet nem olvastat. A `video.scene.generate` úgyis csak promptot fogad, a
 * szám képei pedig maguk is ebből a szövegből készültek: visszakérdezni
 * róluk annyi, mint a saját válaszunkat olvastatni vissza egy képolvasó
 * modellel — egy hívással drágább, egy lépéssel pontatlanabb, és olyan
 * sávhoz köt, amiben nem mindig áll modell. Profilt ezért sem kér: lásd
 * `writeImageScene`.
 *
 * Szöveg nélkül nincs miből: a hívó szűr rá (`no-lyrics`).
 */
export async function writeClipPrompt(
	client: GatewayClient,
	song: Song,
	lyrics: string
): Promise<string> {
	const result = await client.execute({
		capability: 'text.complete',
		input: {
			prompt:
				`Below are the lyrics of the song "${song.name}". Read them ` +
				'and describe ONE scene a short looping music-video clip ' +
				'could be built from — what is in the frame, where it is, ' +
				'in what light and weather — and ONE slow movement for it. ' +
				'Take the imagery from the words themselves: a line naming ' +
				'a place, an object or a sky is worth more than a summary ' +
				'of the meaning. Never quote a line, and never put writing ' +
				'in the frame.' +
				`\n\n${lyrics}`,
			systemPrompt:
				'You write briefs for a video model. You are precise, ' +
				'visual and short, you never quote song lyrics, and you ' +
				'never describe text or logos.',
			responseSchema: SCENE_SCHEMA,
			maxTokens: 400,
		},
		context: { sceneType: 'track-clip', templateId: song.uid },
	});

	if (result.kind !== 'result' || !result.output?.text) {
		throw new TrackMediaError(
			'A jelenet megírása nem sikerült.',
			'gateway'
		);
	}

	return buildClipPrompt(result.output.text, song);
}

/**
 * A videó-prompt: a modell leírta jelenet, a mozgás, és a stíluszár. Külön
 * függvény, hogy a zár és a hosszvágás teszt alá kerüljön — a klip kinézete
 * ezen a néhány soron áll.
 */
export function buildClipPrompt(sceneJson: string, song: Song): string {
	let scene = '';
	let motion = '';

	try {
		const parsed = JSON.parse(sceneJson) as {
			scene?: string;
			motion?: string;
		};

		scene = String(parsed.scene ?? '').trim();
		motion = String(parsed.motion ?? '').trim();
	} catch {
		// A séma ellenére nem JSON: a szöveg maga is lehet a jelenet.
		scene = sceneJson.trim();
	}

	if (!scene) {
		throw new TrackMediaError(
			'A képekből nem lett használható jelenet.',
			'gateway'
		);
	}

	return [scene, motion, STYLE_LOCK, `Mood of the song "${song.name}".`]
		.filter(Boolean)
		.join(' ')
		.slice(0, MAX_PROMPT_CHARS);
}

// ── A becslés ───────────────────────────────────────────────────────────────

/**
 * Mibe kerülne egy klip. Nem fut modellt és nem von le keretet: ez az a szám,
 * amit az admin a gomb mellett lát, mielőtt megnyomja.
 */
export async function estimateTrackClip(
	database: Firestore,
	client: GatewayClient,
	trackUid: string,
	quality: QualityProfile | undefined,
	now: number
): Promise<TrackClipEstimate> {
	const song = await readSong(database, trackUid);

	await requireLyrics(database, song);

	const [left, estimate] = await Promise.all([
		remaining(database, 'clip', now),
		client
			.estimate({
				capability: 'video.scene.generate',
				...profileOf(quality),
				input: {
					prompt: STYLE_LOCK,
					durationSeconds: CLIP_SECONDS,
					aspectRatio: ASPECT_RATIO,
				},
			})
			.catch((error: unknown) => {
				// Az ár nem életbevágó: a gomb egy ismeretlen árral is
				// megnyomható, a keret pedig akkor is véd.
				logger.warn('A klip árát nem tudtuk megkérdezni', error);

				return null;
			}),
	]);

	return {
		costUsd: estimate?.estimatedCostUsd ?? null,
		currency: 'USD',
		model: estimate?.model ?? null,
		remainingToday: left,
	};
}

// ── A klip indítása ─────────────────────────────────────────────────────────

/**
 * Elindítja a generálást, és a feladat állapotával tér vissza. Ha már fut
 * egy, nem indít másodikat: egy számnak egy klipje van, és a futó munkát a
 * `status` fejezi be.
 */
export async function startTrackClip(
	database: Firestore,
	client: GatewayClient,
	trackUid: string,
	uid: string,
	quality: QualityProfile | undefined,
	now: number
): Promise<TrackClipState> {
	const song = await readSong(database, trackUid);
	const lyrics = await requireLyrics(database, song);
	const job = database.collection(TRACK_CLIP_COLLECTION).doc(song.uid);
	const existing = await job.get();
	const status = existing.get('status') as TrackClipStatus | undefined;

	if (status === 'queued' || status === 'running') {
		throw new TrackMediaError(
			'Ehhez a számhoz már készül egy videó.',
			'running'
		);
	}

	const left = await reserve(database, 'clip', now);
	// A jelenet a dal szavaiból; a képek ugyanonnan jöttek, őket a
	// videómodell úgysem látná.
	const prompt = await writeClipPrompt(client, song, lyrics);

	const accepted = await client.execute({
		capability: 'video.scene.generate',
		...profileOf(quality),
		input: {
			prompt,
			negativePrompt: NEGATIVE_PROMPT,
			durationSeconds: CLIP_SECONDS,
			aspectRatio: ASPECT_RATIO,
			generateAudio: false,
		},
		// A szám hangja a zene; a klip csak kép.
		context: { sceneType: 'track-clip', templateId: song.uid },
		// Indításonként egy kulcs: az SDK újrapróbája ugyanazt az executiont
		// kapja vissza, nem egy második számlát — egy új gombnyomás viszont
		// új klipet rendel. A napi kulcs korábban minden aznapi újraindításra
		// a reggeli klipet adta vissza, miközben a keretből levont. A
		// párhuzamos rendelést a fenti `running` ellenőrzés fogja meg.
		idempotencyKey: `track-clip:${song.uid}:${now}`,
	});

	await job.set({
		trackUid: song.uid,
		albumUid: song.albumUid,
		status: accepted.status === 'running' ? 'running' : 'queued',
		executionId: accepted.executionId,
		prompt,
		styleVersion: MEDIA_STYLE_VERSION,
		startedBy: uid,
		startedAt: now,
		updatedAt: now,
		error: null,
	});

	logger.info(
		`klip indítva: ${song.uid} — execution ${accepted.executionId}`
	);

	return {
		status: accepted.status === 'running' ? 'running' : 'queued',
		executionId: accepted.executionId,
		prompt,
		error: null,
		clip: null,
		remainingToday: left,
	};
}

// ── Az állapot, és a kész fájl iktatása ─────────────────────────────────────

/**
 * Hol tart a klip. Egy futó munkát megkérdez a gatewaytől, és ha kész, el is
 * teszi: a fájl Storage-ba, fölé dokumentum, a hivatkozás a szám
 * dokumentumába.
 */
export async function readTrackClipState(
	database: Firestore,
	client: GatewayClient,
	downloadArtifact: (executionId: string) => Promise<GatewayArtifact>,
	trackUid: string,
	now: number
): Promise<TrackClipState> {
	const song = await readSong(database, trackUid);
	const job = database.collection(TRACK_CLIP_COLLECTION).doc(song.uid);
	const snapshot = await job.get();
	const left = () => remaining(database, 'clip', now);

	if (!snapshot.exists) {
		return {
			status: 'none',
			executionId: null,
			prompt: null,
			error: null,
			clip: await storedClip(database, song.uid),
			remainingToday: await left(),
		};
	}

	const status = (snapshot.get('status') as TrackClipStatus) ?? 'none';
	const executionId = (snapshot.get('executionId') as string) ?? null;
	const prompt = (snapshot.get('prompt') as string) ?? null;

	if (status !== 'queued' && status !== 'running') {
		return {
			status,
			executionId,
			prompt,
			error: (snapshot.get('error') as string) ?? null,
			clip: await storedClip(database, song.uid),
			remainingToday: await left(),
		};
	}

	if (!executionId) {
		return {
			status: 'failed',
			executionId: null,
			prompt,
			error: 'A generálásnak nincs azonosítója.',
			clip: null,
			remainingToday: await left(),
		};
	}

	const execution = await client.getExecution(executionId);

	if (
		execution.status === 'queued' ||
		execution.status === 'running' ||
		execution.status === 'accepted'
	) {
		await job.set({ status: 'running', updatedAt: now }, { merge: true });

		return {
			status: 'running',
			executionId,
			prompt,
			error: null,
			clip: null,
			remainingToday: await left(),
		};
	}

	// A kész klipnek nem kell `mediaUrl`: a fájl a hitelesített
	// artifact-végpontról jön (`keepClip`), a link pedig nem mindig van ott.
	// Ezen a feltételen állt meg korábban minden kész klip.
	if (execution.status !== 'succeeded') {
		// `||`, nem `??`: egy üres hibaszöveg a kliensen semmit nem mutatna,
		// a futásjelző pedig szó nélkül eltűnne.
		const error =
			execution.error?.message?.trim() ||
			`A generálás ${execution.status} állapotban zárult.`;

		await job.set(
			{ status: 'failed', error, updatedAt: now },
			{ merge: true }
		);

		return {
			status: 'failed',
			executionId,
			prompt,
			error,
			clip: null,
			remainingToday: await left(),
		};
	}

	const clip = await keepClip(database, song, executionId, downloadArtifact, {
		durationSeconds: execution.output?.durationSeconds ?? CLIP_SECONDS,
		mimeType: execution.output?.mimeType ?? 'video/mp4',
		model: execution.model ?? null,
		prompt: prompt ?? '',
		now,
	});

	await job.set(
		{ status: 'succeeded', error: null, updatedAt: now },
		{ merge: true }
	);

	return {
		status: 'succeeded',
		executionId,
		prompt,
		error: null,
		clip,
		remainingToday: await left(),
	};
}

/** A számon már ott lévő klip, ha van. */
async function storedClip(
	database: Firestore,
	trackUid: string
): Promise<TrackClip | null> {
	const snapshot = await database
		.collection(TRACK_COLLECTION)
		.doc(trackUid)
		.get();

	return (snapshot.get('clip') as TrackClip | undefined) ?? null;
}

/** Egy kép letöltése a gateway címéről, józan határral. */
async function download(url: string): Promise<Buffer> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new TrackMediaError(
			`A kész fájlt nem tudtuk letölteni (${response.status}).`,
			'gateway'
		);
	}

	// A hosszt a letöltés ELŐTT kérdezzük meg: a fájl a memórián át megy, és
	// egy példányt egy elszabadult válasz is elvihet. A letöltés utáni
	// ellenőrzés azért marad, mert `content-length` nem mindig jön.
	if (
		Number(response.headers.get('content-length') ?? '0') > MAX_FILE_BYTES
	) {
		throw new TrackMediaError('A kész fájl túl nagy.', 'gateway');
	}

	const bytes = Buffer.from(await response.arrayBuffer());

	if (bytes.byteLength > MAX_FILE_BYTES) {
		throw new TrackMediaError('A kész fájl túl nagy.', 'gateway');
	}

	return bytes;
}

/**
 * A kész klip eltevése: letöltés a gateway artifact-végpontjáról, objektum a `document/`
 * mappába, fölé dokumentum a `track-clip` kategóriával, és a hivatkozás a
 * szám dokumentumába.
 *
 * Miért nem a gateway URL-je kerül a katalógusba: az aláírt artifact-cím
 * lejár, a katalógus pedig marad. A fájl a sajátunk, a `document/` mappa
 * olvasásra nyitott (ahogy a borítóké), így a lejátszó egyszerű `<video>`-val
 * játssza.
 */
async function keepClip(
	database: Firestore,
	song: Song,
	executionId: string,
	downloadArtifact: (executionId: string) => Promise<GatewayArtifact>,
	details: {
		durationSeconds: number | null;
		mimeType: string;
		model: string | null;
		prompt: string;
		now: number;
	}
): Promise<TrackClip> {
	const artifact = await downloadArtifact(executionId);
	const bytes = artifact.bytes;

	if (!bytes.length) {
		throw new TrackMediaError(
			'A kész klip üres fájlként jött meg.',
			'gateway'
		);
	}

	if (bytes.byteLength > MAX_FILE_BYTES) {
		throw new TrackMediaError('A kész fájl túl nagy.', 'gateway');
	}

	const extension = details.mimeType === 'video/webm' ? 'webm' : 'mp4';
	const originalName = `${song.uid}-clip-${executionId}.${extension}`;
	const uploaded = await uploadDocumentFile(
		bytes,
		originalName,
		details.mimeType
	);
	const documentUid = database.collection(DOCUMENT_COLLECTION).doc().id;
	const name = `${song.name} — videó`;
	const clip: TrackClip = {
		entityType: DOCUMENT_ENTITY_TYPE,
		uid: documentUid,
		name,
		filePath: uploaded.filePath,
		category: TRACK_CLIP_CATEGORY,
		durationSeconds: details.durationSeconds,
		mimeType: details.mimeType,
		executionId,
		model: details.model,
		prompt: details.prompt,
		createdAt: details.now,
	};

	await database.runTransaction(async (transaction) => {
		writeDocument(
			database,
			transaction,
			{
				uid: documentUid,
				name,
				originalName,
				fileType: details.mimeType,
				filePath: uploaded.filePath,
				category: TRACK_CLIP_CATEGORY,
			},
			details.now
		);
		transaction.set(
			database.collection(TRACK_COLLECTION).doc(song.uid),
			stamp({ clip }),
			{ merge: true }
		);
		touchCatalog(database, transaction, FEATURE_KEYS);
	});

	logger.info(`klip eltéve: ${song.uid} — ${uploaded.storagePath}`);

	return clip;
}

/** Leveszi a klipet a számról; a fájl és a dokumentuma marad. */
export async function forgetTrackClip(
	database: Firestore,
	trackUid: string
): Promise<void> {
	await database.runTransaction(async (transaction) => {
		transaction.set(
			database.collection(TRACK_COLLECTION).doc(trackUid),
			stamp({ clip: FieldValue.delete() }),
			{ merge: true }
		);
		touchCatalog(database, transaction, [TRACK_COLLECTION]);
	});
}
