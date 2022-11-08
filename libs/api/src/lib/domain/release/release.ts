import { FormGroup } from '@angular/forms';

import {
	CountryEnum,
	FormatDescriptionEnum,
	FormatEnum,
	Identifiable,
	MediaEnum,
	Searchable,
} from '../../common';
import { AlbumEntity, SimpleAlbum } from '../album';
import { ArtistEntity } from '../artist';
import { LabelEntity } from '../label';

export interface Release {
	album: SimpleAlbum;
	artist: ReleaseArtist;
	country: CountryEnum;
	format: FormatEnum;
	formatDescription: FormatDescriptionEnum;
	label: ReleaseLabel;
	media: MediaEnum;
	name: string;
}

export type ReleaseEntity = Release &
	Identifiable & {
		date: Date;
	};

export type ReleaseEntityAdd = Omit<ReleaseEntity, 'uid'>;

export type ReleaseEntityUpdate = Partial<ReleaseEntity> & Identifiable;

export type ReleaseModel = Release &
	Identifiable &
	Searchable & {
		date: number;
	};

export type ReleaseModelAdd = Omit<ReleaseModel, 'uid'>;

export type ReleaseModelUpdate = Partial<ReleaseModel> &
	Identifiable &
	Searchable;

export type ReleaseFormParams = {
	artists: ArtistEntity[];
	albums: AlbumEntity[];
	countryList: CountryEnum[];
	formGroup: FormGroup;
	formatList: FormatEnum[];
	formatDescriptionList: FormatDescriptionEnum[];
	labels: LabelEntity[];
	mediaList: MediaEnum[];
};

export type ReleaseTableParams = {
	releases: ReleaseEntity[];
	empty: string[];
};

export type ReleaseListParams = {
	releases: ReleaseEntity[];
};

export type ReleaseArtist = Omit<
	ArtistEntity,
	'sites' | 'members' | 'description' | 'formedIn' | 'genre' | 'styles'
>;

export type ReleaseLabel = Omit<LabelEntity, 'parent'>;
