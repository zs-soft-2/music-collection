import { ActionEnum } from '../../../core';
import { GenreResourceEnum } from './genre-resource.enum';

export class GenrePermissionsService {
	static readonly createGenreEntity =
		ActionEnum.CREATE.toString() +
		GenreResourceEnum.GENRE_ENTITY.toString();
	static readonly deleteGenreEntity =
		ActionEnum.DELETE.toString() +
		GenreResourceEnum.GENRE_ENTITY.toString();
	static readonly updateGenreEntity =
		ActionEnum.UPDATE.toString() +
		GenreResourceEnum.GENRE_ENTITY.toString();
	static readonly viewGenreEntity =
		ActionEnum.VIEW.toString() + GenreResourceEnum.GENRE_ENTITY.toString();
}
