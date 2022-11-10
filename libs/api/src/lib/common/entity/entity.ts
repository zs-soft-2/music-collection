import { Identifiable } from '../identifiable';
import { Meta } from '../meta';
import { EntityTypeEnum } from './entity-type.enum';

export type Entity = {
	entityType: EntityTypeEnum;
	meta?: Meta;
} & Identifiable;

export type EntityAdd = Omit<Entity, 'id, meta'>;

export type EntityUpdate = Partial<Entity> & Identifiable;
