import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../common';
import { ReleaseEntity } from '../release';

export interface CollectionItem {
	description?: string;
	release: ReleaseEntity;
	userId: string;
}

export type CollectionItemEntity = CollectionItem &
	Entity & {
		date: Date;
	};

export type CollectionItemEntityAdd = Omit<CollectionItemEntity, 'uid'>;

export type CollectionItemEntityUpdate = Partial<CollectionItemEntity> & Entity;

export type CollectionItemModel = CollectionItem &
	Entity &
	Searchable & {
		date: number;
	};

export type CollectionItemModelAdd = Omit<CollectionItemModel, 'uid'>;

export type CollectionItemModelUpdate = Partial<CollectionItemModel> & Entity;

export type CollectionItemFormParams = {
	releases: ReleaseEntity[];
	formGroup: FormGroup;
};

export type CollectionItemListParams = {
	collectionItems: CollectionItemEntity[];
};

export type CollectionItemTableParams = {
	collectionItems: CollectionItemEntity[];
	empty: string[];
};
