import { FormGroup } from '@angular/forms';

import {
	Entity,
	FormatEnum,
	GenreEnum,
	Searchable,
	StyleEnum,
} from '../../../common';
import { DocumentEntity } from '../../document';
import { ArtistEntity } from '../artist';

export interface Album {
	artist: AlbumArtist;
	coverImage: AlbumDocument | null;
	format: FormatEnum;
	genre: GenreEnum;
	name: string;
	songs: string[];
	styles: StyleEnum[];
}

export type AlbumEntity = Album &
	Entity & {
		year: Date;
	};

export type AlbumEntityAdd = Omit<AlbumEntity, 'uid'>;

export type AlbumEntityUpdate = Partial<AlbumEntity> & Entity;

export type AlbumModel = Album &
	Entity &
	Searchable & {
		year: number;
	};

export type AlbumModelAdd = Omit<AlbumModel, 'uid'>;

export type AlbumModelUpdate = Partial<AlbumModel> & Entity;

export type AlbumFormParams = {
	artists: ArtistEntity[];
	documents: DocumentEntity[];
	formatList: FormatEnum[];
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
	| 'sites'
	| 'members'
	| 'description'
	| 'formedIn'
	| 'genre'
	| 'styles'
	| 'country'
> &
	Searchable;

export type AlbumDocument = Omit<DocumentEntity, 'originalName' | 'fileType'>;

export type SimpleAlbum = Omit<AlbumEntity, 'year'>;

export type AlbumDetailViewParams = {
	album: AlbumEntity | null;
	imageHeight: string;
	imageWidth: string;
};
