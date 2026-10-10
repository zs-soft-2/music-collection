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
	/**
	 * Whether the pressing is still offered. Missing or `true` on everything
	 * the catalog has ever held; `false` is a release an admin archived
	 * because copies of it are already on somebody's shelf and it cannot be
	 * deleted — a duplicate, or a page that turned out wrong.
	 *
	 * Archived is not gone: the copies keep pointing at it and its page still
	 * reads. It is only taken off what a form offers, so no new copy is filed
	 * under it. See `EntityUsage` for what refuses a delete in the first
	 * place.
	 */
	active?: boolean;
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
	/**
	 * What colour this pressing's sleeve is, as `#rrggbb`.
	 *
	 * It belongs to the pressing and not to the album on purpose: the same
	 * record is pressed in a black sleeve one year and a red one the next,
	 * and on a shelf that is the whole difference between them. The shelf
	 * draws the spine in it; a pressing without one keeps the colour the
	 * shelf has always made up from its title.
	 */
	coverColor?: string | null;
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

/**
 * A sleeve colour as the catalog keeps it: `#rrggbb` in lower case, or null
 * where there is none.
 *
 * Everything that writes the colour goes through here, and everything that
 * draws with it reads the same shape back. That matters more than it looks:
 * the shelf feeds the value straight to CSS, and one malformed string there
 * does not tint a spine wrong — it takes the whole declaration down and
 * leaves a see-through record standing in the cubby.
 */
export function toCoverColor(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const hex = value.trim().toLowerCase();
	const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(hex);

	if (short) {
		const [, red, green, blue] = short;

		return `#${red}${red}${green}${green}${blue}${blue}`;
	}

	return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

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
