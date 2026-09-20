import { Configurable, Identifiable } from '@music-collection/common/api';

export interface DynamicProperties {
	[key: string]: boolean;
}

export type DynamicConfigEntity = {
	componentId: string;
} & Identifiable &
	Configurable;

export type DynamicConfigEntityAdd = Omit<DynamicConfigEntity, 'id'>;

export type DynamicConfigEntityUpdate = Partial<DynamicConfigEntity> &
	Identifiable;
