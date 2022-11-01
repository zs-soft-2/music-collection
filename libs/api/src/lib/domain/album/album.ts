import { FormGroup } from '@angular/forms';

import { GenreEnum, Identifiable, Searchable, StyleEnum } from '../../common';
import { ArtistEntity } from '../artist';
import { DocumentEntity } from '../document';

export interface Album {
	artist: AlbumArtist;
	coverImage?: DocumentEntity;
	genre: GenreEnum;
	name: string;
	songs: string[];
	styles: StyleEnum[];
}

export type AlbumEntity = Album &
	Identifiable & {
		year: Date;
	};

export type AlbumEntityAdd = Omit<AlbumEntity, 'uid'>;

export type AlbumEntityUpdate = Partial<AlbumEntity> & Identifiable;

export type AlbumModel = Album &
	Identifiable &
	Searchable & {
		year: number;
	};

export type AlbumModelAdd = Omit<AlbumModel, 'uid'>;

export type AlbumModelUpdate = Partial<AlbumModel> & Identifiable;

export type AlbumFormParams = {
	artists: ArtistEntity[];
	documents: DocumentEntity[];
	formGroup: FormGroup;
	isImagesTabActive: boolean;
	styleList: StyleEnum[];
};

export type AlbumTableParams = {
	albums: AlbumEntity[];
	empty: string[];
};

export type AlbumListParams = {
	albums: AlbumEntity[];
};

export type AlbumArtist = Omit<
	ArtistEntity,
	'sites' | 'members' | 'description' | 'formedIn' | 'genre' | 'styles'
>;
