import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../../common';

/** A person (or group) credited on releases. */
export interface Musician {
	name: string;
	discogsId: number | null;
	source?: string;
	/** Details from the Discogs profile; missing until imported. */
	realName?: string | null;
	/** Biography with Discogs markup (see `cleanDescription`). */
	description?: string | null;
	sites?: string[];
	/** Other names the musician performed under. */
	aliases?: string[];
	/** Spellings used in credits, e.g. "C. Vrenna". */
	nameVariations?: string[];
	/** Portrait on Discogs. */
	imageUrl?: string | null;
}

export type MusicianEntity = Musician & Entity;

export type MusicianEntityAdd = Omit<MusicianEntity, 'uid'>;

export type MusicianEntityUpdate = Partial<MusicianEntity> & Entity;

export type MusicianModel = Musician & Entity & Searchable;

export type MusicianModelAdd = Omit<MusicianModel, 'uid'>;

export type MusicianModelUpdate = Partial<MusicianModel> & Entity & Searchable;

export type MusicianFormParams = {
	formGroup: FormGroup;
};

export type MusicianTableParams = {
	musicians: MusicianEntity[];
	loading: boolean;
};
