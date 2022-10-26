import { Identifiable } from '../identifiable';
import { Meta } from '../meta';
import { EntityType } from './entity.type';

export type Entity = {
	entityType: EntityType;
	meta: Meta;
} & Identifiable;

export type EntityAdd = Omit<Entity, 'id, meta'>;

export type EntityUpdate = Partial<Entity> & Identifiable;
