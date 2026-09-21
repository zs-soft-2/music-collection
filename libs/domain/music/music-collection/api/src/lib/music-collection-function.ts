import { MusicCollection } from './music-collection';

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
export const READ_BADGE_GENERATION_SETTINGS_FUNCTION =
	'readBadgeGenerationSettings';
export const UPDATE_BADGE_GENERATION_SETTINGS_FUNCTION =
	'updateBadgeGenerationSettings';

/** One generated candidate, until somebody picks between them. */
export interface BadgeCandidate {
	/** Storage path; the client resolves the URL. */
	path: string;
	index: number;
}

/** What generating returns; the frozen image is made of this. */
export interface GenerateBadgeResult {
	candidates: BadgeCandidate[];
	prompt: string;
	negativePrompt: string;
	seed: number;
	styleVersion: number;
	model: string;
}

/**
 * What an admin may set about generation. The style lock and the style
 * version are deliberately not among them: those are what hold the badges
 * together as one set, and they stay in code, versioned.
 */
export interface BadgeGenerationSettings {
	enabled: boolean;
	model: string;
	location: string;
	candidateCount: number;
	dailyImageLimit: number;
}
