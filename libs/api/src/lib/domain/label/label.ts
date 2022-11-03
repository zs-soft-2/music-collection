import { FormGroup } from '@angular/forms';

import { Identifiable, Searchable } from '../../common';

export interface Label {
	name: string;
	parent: LabelEntity | null;
}

export type LabelEntity = Label & Identifiable;

export type LabelEntityAdd = Omit<LabelEntity, 'uid'>;

export type LabelEntityUpdate = Partial<LabelEntity> & Identifiable;

export type LabelModel = Label & Identifiable & Searchable;

export type LabelModelAdd = Omit<LabelModel, 'uid'>;

export type LabelModelUpdate = Partial<LabelModel> & Identifiable & Searchable;

export type LabelFormParams = {
	labels: LabelEntity[];
	formGroup: FormGroup;
};

export type LabelTableParams = {
	labels: LabelEntity[];
	empty: string[];
};
