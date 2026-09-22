import { SelectItem } from 'primeng/api';

import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../../common';
import { ReleaseEntity } from '../release';

export type CollectionItemDisposalReason =
	| 'sold'
	| 'traded'
	| 'gifted'
	| 'lost'
	| 'other';

export const COLLECTION_ITEM_DISPOSAL_REASONS: CollectionItemDisposalReason[] =
	['sold', 'traded', 'gifted', 'lost', 'other'];

/**
 * How a copy left the collection. The item is kept as history: it no longer
 * counts as owned, but can be looked back on or restored.
 */
export interface CollectionItemDisposal {
	reason: CollectionItemDisposalReason;
	/** When it left the collection (epoch ms). */
	date: number;
	note: string | null;
}

/**
 * Where the copy stands in the room: which drawn unit, which compartment of
 * it, and how far along that compartment it is. Rows and columns are counted
 * from the top left starting at 1 — a place a collector could read out loud.
 *
 * The compartment is named by row and column rather than by a running number,
 * so a unit redrawn on its side (4 x 2 into 2 x 4) does not send every record
 * in it somewhere else.
 */
export interface CollectionItemPlacement {
	/** `ShelfUnitLayout.id` of the drawn unit. */
	unitId: string;
	/** Compartment row, counted from the top, 1-based. */
	row: number;
	/** Compartment column, counted from the left, 1-based. */
	column: number;
	/** Order within the compartment, counted from the left, 1-based. */
	position: number;
}

export interface CollectionItem {
	description?: string;
	/**
	 * Where the collector filed this copy. `null` or missing leaves it to the
	 * shelf, which files it in the reading order as it always has.
	 */
	placement?: CollectionItemPlacement | null;
	/** Set once the copy left the collection; `null` or missing while owned. */
	disposal?: CollectionItemDisposal | null;
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
		/**
		 * The artist's name in growing prefixes, the way `searchParameters`
		 * holds the release's: this is what a search by artist looks in.
		 * Missing on a document written before the collection was searched
		 * by artist — those are filled in by
		 * `tools/sync/backfill-collection-item-artist.mjs`.
		 */
		artistSearchParameters?: string[];
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
