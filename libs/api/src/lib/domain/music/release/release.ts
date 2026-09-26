import { FormGroup } from '@angular/forms';

import {
	ReleaseCountryEnum,
	Entity,
	FormatDescriptionEnum,
	MediaEnum,
	Searchable,
} from '../../../common';
import { AlbumEntity } from '../album';
import { ArtistEntity } from '../artist';
import { LabelEntity } from '../label';

export interface Release {
	album: AlbumEntity;
	artist: ReleaseArtist;
	/**
	 * The catalog number the label printed on this pressing (e.g. "MOVLP2620").
	 * It is what a spine or a back cover shows, so it is the key a scanned
	 * photo can be matched on without asking Discogs.
	 */
	catno?: string | null;
	/** Unknown on a generic release, and on some imported pressings. */
	country: ReleaseCountryEnum | null;
	/** The Discogs pressing this release was imported from, when it was. */
	discogsReleaseId?: number | null;
	formatDescription: FormatDescriptionEnum;
	/**
	 * Not a pressing but the album itself on a medium: the collector knows it
	 * is a vinyl or a CD of it, and nothing about the label, the country or
	 * the year it was pressed. There is one per album and medium, shared by
	 * every collector who owns such a copy (see `genericReleaseUid`).
	 */
	generic?: boolean;
	/** None on a generic release, nor on a pressing Discogs names none for. */
	label: ReleaseLabel | null;
	media: MediaEnum;
	name: string;
}

export type ReleaseEntity = Release &
	Entity & {
		date: Date;
	};

export type ReleaseEntityAdd = Omit<ReleaseEntity, 'uid'>;

export type ReleaseEntityUpdate = Partial<ReleaseEntity> & Entity;

export type ReleaseModel = Release &
	Entity &
	Searchable & {
		date: number;
	};

export type ReleaseModelAdd = Omit<ReleaseModel, 'uid'>;

export type ReleaseModelUpdate = Partial<ReleaseModel> & Entity & Searchable;

export type ReleaseFormParams = {
	artists: ArtistEntity[];
	albums: AlbumEntity[];
	countryList: ReleaseCountryEnum[];
	formGroup: FormGroup;
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
	| 'sites'
	| 'members'
	| 'description'
	| 'formedIn'
	| 'genre'
	| 'styles'
	| 'country'
>;

export type ReleaseLabel = Omit<LabelEntity, 'parent'>;

/** The media a generic release can be on: a copy the collector can hold. */
export const GENERIC_RELEASE_MEDIA = [
	MediaEnum.vinyl,
	MediaEnum.cd,
	MediaEnum.dvd,
	MediaEnum.cassette,
] as const;

export type GenericReleaseMedia = (typeof GENERIC_RELEASE_MEDIA)[number];

/**
 * The generic release's id. Fixed, so every collector of the album on that
 * medium lands on the same document instead of each creating their own; the
 * album's id is in it because releases are listed across all albums (a
 * collection group), where the id has to be unique on its own.
 */
export function genericReleaseUid(
	albumUid: string,
	media: GenericReleaseMedia
): string {
	return `generic-${albumUid}-${media}`;
}

/** Callable name of the generic release (apps/functions). */
export const ENSURE_GENERIC_RELEASE_FUNCTION = 'ensureGenericRelease';

export interface EnsureGenericReleaseInput {
	artistUid: string;
	albumUid: string;
	media: GenericReleaseMedia;
}

/** The release as stored: `date` is epoch ms, or null for an undated album. */
export interface EnsureGenericReleaseResult {
	release: Omit<ReleaseModel, 'date' | 'searchParameters'> & {
		date: number | null;
	};
	/** It did not exist before this call. */
	created: boolean;
}
