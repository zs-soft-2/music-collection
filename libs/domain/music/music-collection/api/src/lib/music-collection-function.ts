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
 * decides — when it was created, which criteria version it is on, and whose
 * it is.
 */
export type MusicCollectionDraft = Omit<
	MusicCollection,
	'createdAt' | 'criteriaVersion' | 'ownerTenantId'
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
