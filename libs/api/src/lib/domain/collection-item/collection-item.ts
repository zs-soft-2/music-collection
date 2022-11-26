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

export type ReleaseForConnectionItem = ReleaseEntity & {
	nameAndMedia: string;
};
export type CollectionItemFormParams = {
	releases: ReleaseForConnectionItem[];
	formGroup: FormGroup;
};

export type CollectionItemListParams = {
	collectionItemMap: CollectionItemMap[];
	fxLayoutValue: string;
};

export type CollectionItemTableParams = {
	collectionItems: CollectionItemEntity[];
	empty: string[];
};

export type CollectionSidebarParams = {
	config: CollectionItemListConfig;
	isSidebarVisible: boolean;
	groupList: CollectionGroupByEnum[];
};

export enum CollectionGroupByEnum {
	default = 'default',
	artist = 'artist',
	style = 'style',
	year = 'year',
}

export const CollectionGroupByList: CollectionGroupByEnum[] = [
	CollectionGroupByEnum.artist,
	CollectionGroupByEnum.style,
	CollectionGroupByEnum.year,
];

export type CollectionItemListConfig = {
	sortBy: 'albumName' | 'albumYear' | null;
	groupBy: CollectionGroupByEnum[] | null;
};

export type CollectionItemMap = {
	name: string;
	collectionItemList: CollectionItemEntity[] | null;
	collectionItemMap: CollectionItemMap | null;
	groupBy: CollectionGroupByEnum;
};
