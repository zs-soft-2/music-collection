import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../../common';
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
	allItems: number;
	collectionItemMaps: CollectionItemMap[];
	fxLayoutValue: string;
};

export type CollectionItemTableParams = {
	collectionItems: CollectionItemEntity[];
	empty: string[];
};

export type CollectionSidebarParams = {
	config: CollectionItemListConfig;
	isSidebarVisible: boolean;
	filterByArtistNameList: string[];
	groupByList: CollectionGroupByEnum[];
	sortByList: CollectionSortByEnum[];
};

export enum CollectionSortByEnum {
	ascAlbumName = 'asc album name',
	descAlbumName = 'desc album name',
	ascArtistName = 'asc artist name',
	descArtistName = 'desc artist name',
	random = 'random',
}

export const collectionSortByList: CollectionSortByEnum[] = [
	CollectionSortByEnum.ascAlbumName,
	CollectionSortByEnum.descAlbumName,
	CollectionSortByEnum.ascArtistName,
	CollectionSortByEnum.descArtistName,
	CollectionSortByEnum.random,
];

export enum CollectionGroupByEnum {
	default = 'default',
	artist = 'artist',
	media = 'media',
	style = 'style',
	year = 'year',
}

export const collectionGroupByList: CollectionGroupByEnum[] = [
	CollectionGroupByEnum.artist,
	CollectionGroupByEnum.media,
	CollectionGroupByEnum.style,
	CollectionGroupByEnum.year,
];

export type CollectionItemListConfig = {
	filterByArtistNames: string[] | null;
	sortBy: CollectionSortByEnum | null;
	groupBy: CollectionGroupByEnum[] | null;
};

export type CollectionItemMap = {
	name: string;
	collectionItemList: CollectionItemEntity[] | null;
	collectionItemMaps: CollectionItemMap[] | null;
	groupBy: CollectionGroupByEnum;
};
