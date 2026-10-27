import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../../common';

export interface Label {
	name: string;
	parent: LabelEntity | null;
	/** Discogs label id; the source of the loaded details. */
	discogsId?: number | null;
	/** Profile text with Discogs markup (see `cleanDescription`). */
	description?: string | null;
	sites?: string[];
	/** Logo on Discogs. */
	imageUrl?: string | null;
}

export type LabelEntity = Label & Entity;

export type LabelEntityAdd = Omit<LabelEntity, 'uid'>;

export type LabelEntityUpdate = Partial<LabelEntity> & Entity;

export type LabelModel = Label & Entity & Searchable;

export type LabelModelAdd = Omit<LabelModel, 'uid'>;

export type LabelModelUpdate = Partial<LabelModel> & Entity & Searchable;

export type LabelFormParams = {
	labels: LabelEntity[];
	formGroup: FormGroup;
};

export type LabelTableParams = {
	labels: LabelEntity[];
	empty: string[];
};
