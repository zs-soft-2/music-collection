import { FormGroup } from '@angular/forms';
import { GenreEnum, Identifiable, StyleEnum } from '../../common';
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
	Identifiable & {
		formedIn: number;
	};

export type ArtistModelAdd = Omit<ArtistModel, 'uid'>;

export type ArtistModelUpdate = Partial<ArtistModel> & Identifiable;

export type ArtistFormParams = {
	documents: DocumentEntity[];
	formGroup: FormGroup;
	isImagesTabActive: boolean;
	styleList: StyleEnum[];
};

export type ArtistTableParams = {
	artists: ArtistEntity[];
};

export type ArtistListParams = {
	artists: ArtistEntity[];
};
