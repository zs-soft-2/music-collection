import { Entity, EntityTypeEnum } from '../../common';

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
