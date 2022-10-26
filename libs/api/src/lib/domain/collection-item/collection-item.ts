import { FormGroup } from '@angular/forms';

import { Identifiable } from '../../common';
import { ReleaseEntity } from '../release';

export interface CollectionItem {
	date: Date;
	description?: string;
	release: ReleaseEntity;
	userId: string;
}

export type CollectionItemEntity = CollectionItem & Identifiable;

export type CollectionItemEntityAdd = Omit<CollectionItemEntity, 'uid'>;

export type CollectionItemEntityUpdate = Partial<CollectionItemEntity> &
	Identifiable;

export type CollectionItemFormParams = {
	releases: ReleaseEntity[];
	formGroup: FormGroup;
};

export type CollectionItemTableParams = {
	collectionItems: CollectionItemEntity[];
};
