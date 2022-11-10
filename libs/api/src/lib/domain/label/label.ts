import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../common';

export interface Label {
	name: string;
	parent: LabelEntity | null;
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
