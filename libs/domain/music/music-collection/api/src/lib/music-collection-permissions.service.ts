import { ActionEnum } from '@music-collection/core/api';

import { MusicCollectionResourceEnum } from './music-collection-resource.enum';

/**
 * The permission names firestore.rules already checks for the definitions
 * (`createMusicCollectionEntity` and friends).
 */
export class MusicCollectionPermissionsService {
	static readonly createMusicCollectionEntity =
		ActionEnum.CREATE.toString() +
		MusicCollectionResourceEnum.MUSIC_COLLECTION_ENTITY.toString();
	static readonly deleteMusicCollectionEntity =
		ActionEnum.DELETE.toString() +
		MusicCollectionResourceEnum.MUSIC_COLLECTION_ENTITY.toString();
	static readonly updateMusicCollectionEntity =
		ActionEnum.UPDATE.toString() +
		MusicCollectionResourceEnum.MUSIC_COLLECTION_ENTITY.toString();
	static readonly viewMusicCollectionEntity =
		ActionEnum.VIEW.toString() +
		MusicCollectionResourceEnum.MUSIC_COLLECTION_ENTITY.toString();
}
