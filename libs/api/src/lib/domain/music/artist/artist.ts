import { MenuItem } from 'primeng/api';

import { FormGroup } from '@angular/forms';

import {
	CountryEnum,
	Entity,
	GenreEnum,
	Searchable,
	StyleEnum,
} from '../../../common';
import { DocumentEntity } from '../../document';
import { AlbumEntity } from '../album';

export interface Artist {
	country?: CountryEnum;
	description: string;
	genre: GenreEnum;
	headerImage?: DocumentEntity;
	mainImage?: DocumentEntity;
	members?: unknown[];
	name: string;
	sites: string[];
	styles: StyleEnum[];
}

export type ArtistEntity = Artist &
	Entity & {
		formedIn: Date;
	};

export type ArtistEntityAdd = Omit<ArtistEntity, 'uid'>;

export type ArtistEntityUpdate = Partial<ArtistEntity> & Entity;

export type ArtistModel = Artist &
	Entity &
	Searchable & {
		formedIn: string;
	};

export type ArtistModelAdd = Omit<ArtistModel, 'uid'>;

export type ArtistModelUpdate = Partial<ArtistModel> & Entity & Searchable;

export type ArtistFormParams = {
	countries: CountryEnum[];
	documents: DocumentEntity[];
	formGroup: FormGroup;
	isImagesTabActive: boolean;
	styleList: StyleEnum[];
};

export type ArtistDetailParams = {
	albums: AlbumEntity[] | undefined;
	artist: ArtistEntity | undefined;
	country?: CountryEnum;
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
