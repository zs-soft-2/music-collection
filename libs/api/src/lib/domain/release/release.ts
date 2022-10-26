import { FormGroup } from '@angular/forms';

import {
	FormatDescriptionEnum,
	FormatEnum,
	Identifiable,
	MediaEnum,
} from '../../common';
import { AlbumEntity } from '../album';
import { ArtistEntity } from '../artist';
import { LabelEntity } from '../label';

export interface Release {
	artist: ReleaseArtist;
	album: ReleaseAlbum;
	date: Date;
	format: FormatEnum;
	formatDescription: FormatDescriptionEnum;
	label: ReleaseLabel;
	media: MediaEnum;
	name: string;
}

export type ReleaseEntity = Release & Identifiable;

export type ReleaseEntityAdd = Omit<ReleaseEntity, 'uid'>;

export type ReleaseEntityUpdate = Partial<ReleaseEntity> & Identifiable;

export type ReleaseFormParams = {
	artists: ArtistEntity[];
	albums: AlbumEntity[];
	isAlbumsActive: boolean;
	formGroup: FormGroup;
	formatList: FormatEnum[];
	formatDescriptionList: FormatDescriptionEnum[];
	labels: LabelEntity[];
	mediaList: MediaEnum[];
};

export type ReleaseTableParams = {
	releases: ReleaseEntity[];
};

export type ReleaseArtist = Omit<
	ArtistEntity,
	'sites' | 'members' | 'description' | 'formedIn' | 'genre' | 'styles'
>;

export type ReleaseAlbum = Omit<AlbumEntity, 'year'>;

export type ReleaseLabel = Omit<LabelEntity, 'parent'>;
