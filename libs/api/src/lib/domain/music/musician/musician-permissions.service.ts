import { ActionEnum } from '../../../core';
import { MusicianResourceEnum } from './musician-resource.enum';

export class MusicianPermissionsService {
	static readonly createMusicianEntity =
		ActionEnum.CREATE.toString() +
		MusicianResourceEnum.MUSICIAN_ENTITY.toString();
	static readonly deleteMusicianEntity =
		ActionEnum.DELETE.toString() +
		MusicianResourceEnum.MUSICIAN_ENTITY.toString();
	static readonly updateMusicianEntity =
		ActionEnum.UPDATE.toString() +
		MusicianResourceEnum.MUSICIAN_ENTITY.toString();
	static readonly viewMusicianEntity =
		ActionEnum.VIEW.toString() +
		MusicianResourceEnum.MUSICIAN_ENTITY.toString();
}
