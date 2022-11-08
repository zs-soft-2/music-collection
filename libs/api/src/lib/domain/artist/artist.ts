import { FormGroup } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { GenreEnum, Identifiable, Searchable, StyleEnum } from '../../common';
import { AlbumEntity } from '../album';
import { DocumentEntity } from '../document';

export interface Artist {
	description: string;
	headerImage?: DocumentEntity;
	mainImage?: DocumentEntity;
	members?: any[];
	name: string;
	sites: string[];
	genre: GenreEnum;
	styles: StyleEnum[];
}

export type ArtistEntity = Artist &
	Identifiable & {
		formedIn: Date;
	};

export type ArtistEntityAdd = Omit<ArtistEntity, 'uid'>;

export type ArtistEntityUpdate = Partial<ArtistEntity> & Identifiable;

export type ArtistModel = Artist &
	Identifiable &
	Searchable & {
		formedIn: number;
	};

export type ArtistModelAdd = Omit<ArtistModel, 'uid'>;

export type ArtistModelUpdate = Partial<ArtistModel> &
	Identifiable &
	Searchable;

export type ArtistFormParams = {
	documents: DocumentEntity[];
	formGroup: FormGroup;
	isImagesTabActive: boolean;
	styleList: StyleEnum[];
};

export type ArtistDetailParams = {
	albums: AlbumEntity[] | undefined;
	artist: ArtistEntity | undefined;
	menuItems: MenuItem[];
	activeMenuItem: MenuItem;
	selectedContent: string;
};

export type ArtistTableParams = {
	artists: ArtistEntity[];
	empty: string[];
};

export type ArtistListParams = {
	artists: ArtistEntity[];
};
