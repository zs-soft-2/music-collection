import { Entity } from './entity';

/** Newest change first; entities never stamped come last. */
export const compareByRecent = (a: Entity, b: Entity): number =>
	(b.updatedAt ?? 0) - (a.updatedAt ?? 0);

/**
 * A copy of the entities, the last created or modified first: the default
 * order of the collection views.
 */
export const sortByRecent = <T extends Entity>(entities: T[]): T[] =>
	[...entities].sort(compareByRecent);
