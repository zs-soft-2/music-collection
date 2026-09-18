import { FormGroup } from '@angular/forms';

import {
	Entity,
	FormatEnum,
	GenreEnum,
	Identifiable,
	Searchable,
	StyleEnum,
} from '../../../common';
import { DocumentEntity } from '../../document';
import { ArtistEntity } from '../artist';

/** Original release of the album on Discogs (set by the Discogs import). */
export interface AlbumDiscogs {
	masterId: number | null;
	releaseId: number;
	/** Release date as given by Discogs, e.g. "1987" or "1987-04-20". */
	released: string | null;
	country: string | null;
	labels: { name: string; catno: string | null }[];
	/** e.g. "Vinyl, LP, Album". */
	formats: string[];
}

export interface Album {
	artist: AlbumArtist;
	coverImage: AlbumDocument | null;
	discogs?: AlbumDiscogs;
	format: FormatEnum;
	genre: GenreEnum;
	name: string;
	songs: string[];
	/** Spotify album id, used for the embedded player on the album page. */
	spotifyAlbumId?: string | null;
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

export type AlbumReference = {
	coverImage: AlbumDocument | null;
	name: string;
} & Identifiable;

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
