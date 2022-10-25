import { FormGroup } from '@angular/forms';

import { Identifiable, StyleEnum } from '../../common';
import { ArtistEntity } from '../artist';

export interface Label {
  name: string;
  parent: Label | null;
}

export type LabelEntity = Label & Identifiable;

export type LabelEntityAdd = Omit<LabelEntity, 'uid'>;

export type LabelEntityUpdate = Partial<LabelEntity> & Identifiable;

export type LabelFormParams = {
  labels: LabelEntity[];
  formGroup: FormGroup;
};

export type LabelTableParams = {
  labels: LabelEntity[];
};
