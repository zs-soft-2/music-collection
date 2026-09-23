import { SelectItem } from 'primeng/api';

import { FormGroup } from '@angular/forms';

import { Entity, Searchable } from '../../../common';
import { ReleaseEntity } from '../release';

export type CollectionItemDisposalReason =
	'sold' | 'traded' | 'gifted' | 'lost' | 'other';

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

/**
 * Goldmine grades — the scale record fairs and Discogs both price by, from
 * a sealed copy down to one kept for the music alone.
 */
export type CollectionItemGrade = 'M' | 'NM' | 'VG+' | 'VG' | 'G' | 'F' | 'P';

export const COLLECTION_ITEM_GRADES: CollectionItemGrade[] = [
	'M',
	'NM',
	'VG+',
	'VG',
	'G',
	'F',
	'P',
];

export const COLLECTION_ITEM_GRADE_LABELS: Record<CollectionItemGrade, string> =
	{
		M: 'Mint',
		NM: 'Near Mint',
		'VG+': 'Very Good Plus',
		VG: 'Very Good',
		G: 'Good',
		F: 'Fair',
		P: 'Poor',
	};

/**
 * How the copy was come by. Every field stands on its own: a record found in
 * a bin is remembered by the fair long after the price is forgotten, and a
 * gift has a place but no price at all.
 */
export interface CollectionItemPurchase {
	/** When it was bought (epoch ms). */
	date: number | null;
	/** Where it came from — a shop, a fair, a webshop, a person. */
	place: string | null;
	/** What was paid, in `currency`. */
	price: number | null;
	/** ISO 4217 code of `price`, e.g. "HUF". */
	currency: string | null;
}

/**
 * The state of the copy. The record and the sleeve are graded apart, the way
 * a seller lists them: a clean pressing in a ringworn jacket is a common
 * thing, and one number could not say it.
 */
export interface CollectionItemCondition {
	media: CollectionItemGrade | null;
	sleeve: CollectionItemGrade | null;
}

/**
 * The copy's own number on a numbered edition — "123 of 500", as it is
 * stamped, embossed or written by hand on the record.
 *
 * Almost no record carries one: a normal pressing runs to thousands of
 * identical copies, and nothing on them tells one collector's from another's.
 * Where a number *is* there, it is the only thing that does — so it is not
 * kept privately like the price or the story, but claimed against every other
 * collector. See `CopySerialClaim` for how that claim is held.
 */
export interface CollectionItemSerial {
	/** The copy's number, counted from 1. */
	number: number;
	/** How many were made, where the record says so. */
	total: number | null;
}

/**
 * The largest number a numbered edition is taken to run to. Editions this
 * large do not exist; the bound is here so a mistyped number cannot claim a
 * range of the registry that no real record will ever want back.
 */
export const COLLECTION_ITEM_SERIAL_MAX = 1000000;

/**
 * A photo of this very copy — the sleeve as it stands in the room, not the
 * catalog cover. At most two: the first is the front, the second the back,
 * and the page turns between them.
 */
export interface CollectionItemPhoto {
	/** Storage path, under `collection-item/{userId}/{itemId}/`. */
	path: string;
	/** Download URL of `path`, so the page needs no Storage round-trip. */
	url: string;
	width: number;
	height: number;
}

/**
 * What the collector tells about a copy, as the copy page saves it in one
 * go. Every field is written on every save, so clearing one is a change like
 * any other rather than a silence the old value survives.
 */
export interface CollectionItemDetails {
	/** The one-line note that stands next to the record. */
	description: string;
	purchase: CollectionItemPurchase | null;
	condition: CollectionItemCondition | null;
	/** The number this copy carries, where the edition was numbered. */
	serial: CollectionItemSerial | null;
	story: string | null;
}

/** The most photos a copy carries: a front and a back. */
export const COLLECTION_ITEM_PHOTO_LIMIT = 2;

export interface CollectionItem {
	description?: string;
	/**
	 * Where the collector filed this copy. `null` or missing leaves it to the
	 * shelf, which files it in the reading order as it always has.
	 */
	placement?: CollectionItemPlacement | null;
	/** Set once the copy left the collection; `null` or missing while owned. */
	disposal?: CollectionItemDisposal | null;
	/** How the copy was come by; missing while nothing is told about it. */
	purchase?: CollectionItemPurchase | null;
	/** Grades of the record and the sleeve; missing while ungraded. */
	condition?: CollectionItemCondition | null;
	/**
	 * The number this copy carries on a numbered edition; missing on the
	 * overwhelming majority of records, which carry none. A number here is
	 * backed by a `CopySerialClaim` — the rules refuse to write one that
	 * another collector holds.
	 */
	serial?: CollectionItemSerial | null;
	/**
	 * The copy's own story, as the collector tells it. `description` stays
	 * the one-line note next to the record; this is the longer telling.
	 */
	story?: string | null;
	/** Photos of this very copy, at most `COLLECTION_ITEM_PHOTO_LIMIT`. */
	photos?: CollectionItemPhoto[] | null;
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
	placement: CollectionItemPlacementParams;
};

/**
 * The shelf place section of the form: the furniture the signed-in collector
 * drew, and which compartment of it the copy is filed into.
 */
export type CollectionItemPlacementParams = {
	/** The drawn units; empty where the collector has drawn no furniture. */
	units: SelectItem<string>[];
	unitId: string;
	/** The compartments of the chosen unit, as `row:column`. */
	spots: SelectItem<string>[];
	/** The chosen compartment, `null` while the copy is filed by the shelf. */
	spot: string | null;
	position: number;
	maxPosition: number;
	/**
	 * A place is kept that no drawn compartment answers to any more — the
	 * unit was thrown out, or redrawn smaller. The copy keeps it until the
	 * form is given another one.
	 */
	lost: boolean;
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
