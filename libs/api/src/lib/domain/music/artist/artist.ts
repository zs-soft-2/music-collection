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

/** What kind of act the artist is; all artists are bands until set. */
export type ArtistType = 'band' | 'project' | 'formation';

export const DEFAULT_ARTIST_TYPE: ArtistType = 'band';

export const ARTIST_TYPE_OPTIONS: { labelKey: string; value: ArtistType }[] = [
	{ labelKey: 'catalog.artistType.band', value: 'band' },
	{ labelKey: 'catalog.artistType.project', value: 'project' },
	{ labelKey: 'catalog.artistType.formation', value: 'formation' },
];

/** Where an artist imported from Discogs comes from. */
export interface ArtistDiscogs {
	artistId?: number;
	/** Photo on Discogs, for artists without an uploaded image. */
	imageUrl?: string | null;
}

export interface Artist {
	/** Missing on artists saved before the field existed: read as a band. */
	artistType?: ArtistType;
	country: CountryEnum;
	description: string;
	discogs?: ArtistDiscogs;
	genre: GenreEnum;
	headerImage?: DocumentEntity;
	/** Photo on the web (Wikimedia Commons), for artists without an uploaded image. */
	imageUrl?: string | null;
	mainImage?: DocumentEntity;
	members?: unknown[];
	/**
	 * The artist's MusicBrainz id, once loaded or typed in. Without it the
	 * online lookup searches on the name, country and styles instead.
	 */
	musicBrainzId?: string | null;
	name: string;
	sites: string[];
	/** `discogs` for artists created by the Discogs import. */
	source?: string;
	styles: StyleEnum[];
}

export type ArtistEntity = Artist &
	Entity & {
		/** Null when unknown (e.g. a band created by the Discogs import). */
		formedIn: Date | null;
	};

export type ArtistEntityAdd = Omit<ArtistEntity, 'uid'>;

export type ArtistEntityUpdate = Partial<ArtistEntity> & Entity;

export type ArtistModel = Artist &
	Entity &
	Searchable & {
		formedIn?: string | null;
	};

export type ArtistModelAdd = Omit<ArtistModel, 'uid'>;

export type ArtistModelUpdate = Partial<ArtistModel> & Entity & Searchable;

export type ArtistReference = {
	name: string;
} & Identifiable;

export type ArtistFormParams = {
	artistTypes: typeof ARTIST_TYPE_OPTIONS;
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
