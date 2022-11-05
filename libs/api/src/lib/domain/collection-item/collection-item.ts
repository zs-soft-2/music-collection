import { FormGroup } from '@angular/forms';

import { Identifiable, Searchable } from '../../common';
import { ReleaseEntity } from '../release';

export interface CollectionItem {
	description?: string;
	release: ReleaseEntity;
	userId: string;
}

export type CollectionItemEntity = CollectionItem &
	Identifiable & {
		date: Date;
	};

export type CollectionItemEntityAdd = Omit<CollectionItemEntity, 'uid'>;

export type CollectionItemEntityUpdate = Partial<CollectionItemEntity> &
	Identifiable;

export type CollectionItemModel = CollectionItem &
	Identifiable &
	Searchable & {
		date: number;
	};

export type CollectionItemModelAdd = Omit<CollectionItemModel, 'uid'>;

export type CollectionItemModelUpdate = Partial<CollectionItemModel> &
	Identifiable;

export type CollectionItemFormParams = {
	releases: ReleaseEntity[];
	formGroup: FormGroup;
};

export type CollectionItemTableParams = {
	collectionItems: CollectionItemEntity[];
};
