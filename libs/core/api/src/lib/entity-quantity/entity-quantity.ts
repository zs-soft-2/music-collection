import { Entity, EntityTypeEnum } from '@music-collection/common/api';

export interface EntityQuantity {
	group: EntityQuantityGroup;
	items: EntityQuantityItem[];
	modifyDate: Date;
	quantity: number;
	type: EntityTypeEnum;
}

export interface EntityQuantityItem {
	name: string;
	uid: string;
}

export type EntityQuantityEntity = EntityQuantity & Entity;
export type EntityQuantityEntityAdd = Omit<EntityQuantityEntity, 'uid'>;
export type EntityQuantityEntityUpdate = Partial<EntityQuantityEntity> & Entity;

export interface EntityQuantityGroup {
	[x: string]: number;
}

export enum UpdateEntityQuantityTypeEnum {
	decrease = 'decrease',
	increase = 'increase',
}

export type UpdateEntityQuantityType =
	| UpdateEntityQuantityTypeEnum.increase
	| UpdateEntityQuantityTypeEnum.decrease;

export const ENTITY_QUANTITY_FEATURE_KEY = 'entity-quantity';

/**
 * Live document counts, keyed by entity type (`EntityTypeEnum` value).
 * Unlike the stored `EntityQuantity` counters they are counted by Firestore
 * on request, so imports and console edits are always included.
 */
export type EntityCounts = Record<string, number>;

/** The collection each countable entity type lives in. */
export const ENTITY_COUNT_COLLECTIONS: Record<string, string> = {
	Artist: 'artist',
	Album: 'album',
	Release: 'release',
	Label: 'label',
	Musician: 'musician',
	Track: 'track',
	'Collection Item': 'collection-item',
	'Wishlist Item': 'wishlist-item',
	Document: 'document',
};

/**
 * The collections that are not the catalog's but a collector's, and are
 * therefore counted under whoever is signed in (`user/{uid}/…`) rather than
 * across the whole tree. Nobody's copies or wishes are anyone else's to
 * count — and the admin lists beside these numbers show the signed-in
 * collector's own too, so the tile and the list agree.
 */
export const OWN_DATA_COUNT_COLLECTIONS: readonly string[] = [
	'collection-item',
	'wishlist-item',
];
