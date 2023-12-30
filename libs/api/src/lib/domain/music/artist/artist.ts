import { MenuItem } from 'primeng/api';

import { FormGroup } from '@angular/forms';

import {
	CountryEnum,
	Entity,
	GenreEnum,
	Identifiable,
	Searchable,
	StyleEnum,
} from '../../../common';
import { DocumentEntity } from '../../document';
import { AlbumEntity } from '../album';

export interface Artist {
	country: CountryEnum;
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

export type ArtistReference = {
	name: string;
} & Identifiable;

export type ArtistFormParams = {
	countries: CountryEnum[];
	documents: DocumentEntity[];
	formGroup: FormGroup;
	isImagesTabActive: boolean;
	styleList: StyleEnum[];
};

export type ArtistDetailViewStateModel = {
	activeMenuItem: MenuItem;
	albums: AlbumEntity[];
	artist: ArtistEntity | null;
	country: CountryEnum | null;
	isLoading: boolean;
	menuItems: MenuItem[];
	selectedContent: string | null;
};

export type ArtistTableParams = {
	artists: ArtistEntity[];
	empty: string[];
};

export type ArtistListParams = {
	artists: ArtistEntity[];
};
