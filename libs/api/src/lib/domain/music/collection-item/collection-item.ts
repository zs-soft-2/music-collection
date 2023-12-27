import { SelectItem } from 'primeng/api';

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

export type CollectionItemListStateModel = {
	allItemsSize: number;
	collectionItemMaps: CollectionItemMap[];
	fxLayoutValue: string;
	isLoading: boolean;
};

export type CollectionItemTableParams = {
	collectionItems: CollectionItemEntity[];
	empty: string[];
};

export type CollectionSidebarStateModel = {
	filterByArtistNames: SelectItem<string>[] | null;
	sortBy: CollectionSortByEnum | null;
	groupBy: SelectItem<CollectionGroupByEnum>[] | null;
	isSidebarVisible: boolean;
	filterByArtistNameList: SelectItem<string>[];
	groupByList: SelectItem<CollectionGroupByEnum>[];
	sortByList: CollectionSortByEnum[];
	isLoading: boolean;
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

export const collectionGroupByList: SelectItem<CollectionGroupByEnum>[] = [
	{
		value: CollectionGroupByEnum.artist,
		label: CollectionGroupByEnum.artist.toString(),
	},
	{
		value: CollectionGroupByEnum.media,
		label: CollectionGroupByEnum.media.toString(),
	},
	{
		value: CollectionGroupByEnum.style,
		label: CollectionGroupByEnum.style.toString(),
	},
	{
		value: CollectionGroupByEnum.year,
		label: CollectionGroupByEnum.year.toString(),
	},
];

export type CollectionItemListConfig = {
	filterByArtistNames: SelectItem<string>[] | null;
	sortBy: CollectionSortByEnum | null;
	groupBy: SelectItem<CollectionGroupByEnum>[] | null;
};

export type CollectionItemMap = {
	name: string;
	collectionItemList: CollectionItemEntity[] | null;
	collectionItemMaps: CollectionItemMap[] | null;
	groupBy: CollectionGroupByEnum;
};
