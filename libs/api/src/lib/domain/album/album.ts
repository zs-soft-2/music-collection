import { FormGroup } from '@angular/forms';

import { GenreEnum, Identifiable, StyleEnum } from '../../common';
import { ArtistEntity } from '../artist';

export interface Album {
	artist: AlbumArtist;
	genre: GenreEnum;
	name: string;
	songs: string[];
	styles: StyleEnum[];
	year: Date;
}

export type AlbumEntity = Album & Identifiable;

export type AlbumEntityAdd = Omit<AlbumEntity, 'uid'>;

export type AlbumEntityUpdate = Partial<AlbumEntity> & Identifiable;

export type AlbumFormParams = {
	artists: ArtistEntity[];
	formGroup: FormGroup;
	styleList: StyleEnum[];
};

export type AlbumTableParams = {
	albums: AlbumEntity[];
};

export type AlbumArtist = Omit<
	ArtistEntity,
	'sites' | 'members' | 'description' | 'formedIn' | 'genre' | 'styles'
>;
