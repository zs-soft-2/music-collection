import { EntityTypeEnum, Identifiable } from '../../common';

export interface EntityQuantity {
	items: EntityQuantityItem[];
	modifyDate: Date;
	quantity: number;
	type: EntityTypeEnum;
}

export interface EntityQuantityItem {
	name: string;
	uid: string;
}

export type EntityQuantityEntity = EntityQuantity & Identifiable;
export type EntityQuantityEntityAdd = Omit<EntityQuantityEntity, 'uid'>;
export type EntityQuantityEntityUpdate = Partial<EntityQuantityEntity> &
	Identifiable;

export const ENTITY_QUANTITY_FEATURE_KEY = 'entity-quantity';
