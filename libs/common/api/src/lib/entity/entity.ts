import { Identifiable } from '../identifiable';
import { Meta } from '../meta';
import { EntityTypeEnum } from './entity-type.enum';

export type Entity = {
	entityType: EntityTypeEnum;
	meta?: Meta;
	/**
	 * Time of the last write (creation included) in epoch milliseconds, read
	 * from the `updatedAt` stamp of FirestoreSyncService. Read only: every
	 * write stamps it anew. Missing on documents never written through it.
	 */
	updatedAt?: number;
} & Identifiable;

export type EntityAdd = Omit<Entity, 'id, meta'>;

export type EntityUpdate = Partial<Entity> & Identifiable;
