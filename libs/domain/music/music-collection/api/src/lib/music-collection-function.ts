import {
	BadgeContextLevel,
	BadgeImage,
	MusicCollection,
} from './music-collection';

/**
 * The callables that write the definitions. `firestore.rules` refuses every
 * client write to `music-collection/{uid}`, so these are the only way in:
 * they check the permission, validate the criteria and keep the client cache
 * in sync. Each name is also the permission it asks for.
 */
export const CREATE_MUSIC_COLLECTION_FUNCTION = 'createMusicCollectionEntity';
export const UPDATE_MUSIC_COLLECTION_FUNCTION = 'updateMusicCollectionEntity';
export const DELETE_MUSIC_COLLECTION_FUNCTION = 'deleteMusicCollectionEntity';

/**
 * A definition as the editor submits it: everything but what the server
 * decides — when it was created, and which criteria version it is on.
 */
export type MusicCollectionDraft = Omit<
	MusicCollection,
	'createdAt' | 'criteriaVersion'
>;

export interface MusicCollectionWriteInput {
	/** Absent when creating. */
	uid?: string;
	collection: MusicCollectionDraft;
}

export interface CreateMusicCollectionResult {
	uid: string;
}

export interface UpdateMusicCollectionResult {
	uid: string;
	/** Raised by the server when the criteria changed. */
	criteriaVersion: number;
}

/**
 * The badge generation callables. The server builds the prompt from the
 * stored definition — the client sends the uid and the resolved points,
 * which only move how rich the rim is.
 */
export const GENERATE_MUSIC_COLLECTION_BADGE_FUNCTION =
	'generateMusicCollectionBadge';
export const SET_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION =
	'setMusicCollectionBadgeImage';
/**
 * Taking an image an admin uploaded into the gallery. The file is already in
 * Storage — the editor put it there, in the folder the drawn pins share — so
 * what travels is its path, and the server is what files a document over it
 * and writes the gallery, which no client may touch.
 */
export const ADOPT_MUSIC_COLLECTION_BADGE_IMAGE_FUNCTION =
	'adoptMusicCollectionBadgeImage';
export const READ_BADGE_GENERATION_SETTINGS_FUNCTION =
	'readBadgeGenerationSettings';
export const UPDATE_BADGE_GENERATION_SETTINGS_FUNCTION =
	'updateBadgeGenerationSettings';

/**
 * What generating returns. Every drawn image is kept: each one becomes a
 * file with a `document` entity over it, and joins the definition's gallery
 * — so a draw an admin walks away from is still there tomorrow, and any
 * image ever drawn for this collection can still be made its badge.
 */
export interface GenerateBadgeResult {
	/** The images this run added to the gallery, in the order drawn. */
	candidates: BadgeImage[];
	prompt: string;
	negativePrompt: string;
	seed: number;
	styleVersion: number;
	/** How much of the collection reached the model. */
	contextLevel: BadgeContextLevel;
	model: string;
}

/**
 * Picking a badge points at an image the gallery already holds — nothing
 * travels back but its `document` id, because the file has existed since the
 * moment it was drawn. A null id is the pin taken off: the badge falls back
 * to the artwork an admin uploaded by hand.
 */
export interface BadgeImagePick {
	uid: string;
	documentUid: string | null;
}

/**
 * What adopting an uploaded image needs: which collection it is for, where
 * the file landed, and what it was called when it was chosen — the name a
 * person would recognise it by in the document admin.
 */
export interface BadgeImageAdoption {
	uid: string;
	/** The object's path in the bucket, under `document/`. */
	storagePath: string;
	fileName: string;
}

/**
 * What an admin may set about generation. The style lock and the style
 * version are deliberately not among them: those are what hold the badges
 * together as one set, and they stay in code, versioned.
 */
export interface BadgeGenerationSettings {
	enabled: boolean;
	candidateCount: number;
	dailyImageLimit: number;
	/**
	 * Which of the gateway's price brackets the drawing runs in. Not a
	 * model name: the gateway assigns a model to the bracket, and it is the
	 * one that knows which provider has what.
	 */
	qualityProfile: BadgeQualityProfile;
	/**
	 * How much of the collection reaches the model before it draws. Not the
	 * same knob as the price bracket, and deliberately not hung off it: the
	 * bracket says what an *image* may cost, this says how many *facts* the
	 * prompt is built from.
	 */
	contextLevel: BadgeContextLevel;
}

/**
 * The gateway's three price brackets, cheapest first.
 *
 * A type, not a list: a value exported from this barrel lands in the main
 * bundle, and the only thing that enumerates the brackets is the admin
 * page, which is lazy. The list lives there.
 */
export type BadgeQualityProfile = 'economy' | 'normal' | 'premium';

/* ────────────────────────────────────────────────────────────────────────
 * Jelenet-próba — IDEIGLENES
 *
 * A kollekciók háttérképéhez keressük a stíluszárat. A próba a badge
 * generáló callable-jén utazik (`probe` mezőben), mert a dev régió
 * CPU-kvótája nem bír el egy új function-t egy kísérlet kedvéért.
 *
 * Csak típusok: egy innen exportált *érték* a fő bundle-be kerülne, a
 * zárak és a méretek listáját pedig egyedül a lusta admin lap sorolja fel.
 * ──────────────────────────────────────────────────────────────────────── */

/** Melyik fogalmazás szerint szól a zár; a `none` a zár nélküli, nyers próba. */
export type SceneStyleDraft = 'nocturne' | 'weathered' | 'interior' | 'none';

/** Amit a próba kér: egy tárgy, egy zár, egy méret, néhány kép. */
export interface SceneProbeInput {
	/** Mi legyen a képen — a kollekció „helye”, egy mondatban. */
	subject: string;
	draft: SceneStyleDraft;
	size: string;
	count: number;
	/**
	 * Melyik modell rajzoljon; üresen a gateway választ az ársáv alapján.
	 *
	 * Ez a mező a próbapad létének fele. A sáv-routing modellnév nélkül
	 * mindig a legolcsóbb képmodellre megy — azon készült eddig minden
	 * jelvény is —, és a drágább sávhoz a gateway nem rendel modellt, tehát
	 * fölfelé csak néven vezet út.
	 */
	model: string | null;
}

/** Egy képmodell, amihez ez a tenant hozzáfér. */
export interface SceneModel {
	id: string;
	provider: string | null;
	/** Minőségpont és ár, ha a gateway katalógusa mond ilyet. */
	label: string;
}

/**
 * Amit a próba ad. A képek `data:` URL-ek: nem készül belőlük se fájl, se
 * `document` entitás, mert háromnegyedük eldobásra születik.
 */
export interface SceneProbeResult {
	images: string[];
	/** Hány kép nem fért a válaszba — a callable 10 MB-nál elhasal. */
	dropped: number;
	prompt: string;
	negativePrompt: string;
	draft: SceneStyleDraft;
	/**
	 * A kért méret — nem feltétlenül a kapott. A Gemini képmodellek
	 * képarányt vesznek, nem pixelt, és négyzetest adnak vissza akkor is, ha
	 * 16:9 ment ki; a valódi méretet a lap a betöltött képről olvassa le.
	 */
	size: string;
	/** Amit kértünk; üres, ha a gateway routingjára bíztuk. */
	requestedModel: string | null;
	/** Amelyik ténylegesen rajzolt. */
	model: string;
}
