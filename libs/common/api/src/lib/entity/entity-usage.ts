/**
 * What keeps an entity alive — the answer a delete turns on.
 *
 * The catalog is denormalised: a release carries its album and its artist
 * whole, and a collector's copy carries the release whole. Nothing in
 * Firestore refuses a delete that would orphan those, so the question has to
 * be asked before the write, and asked of the server: the client's cache
 * holds the catalog, not other collectors' shelves.
 *
 * Two kinds of hold, and the difference is the whole point:
 *  - `blocking` is somebody else's: another collector's copy, a request
 *    waiting to be decided. It cannot be tidied away from here, so the
 *    delete is refused and the entity is archived instead.
 *  - `cascading` is the entity's own: the pressing's tracks, its serial
 *    claims. Those go with it, and saying so is what makes a confirmation
 *    honest.
 */
export interface EntityUsageHold {
	/** The collection that holds it: `collection-item`, `track`, … */
	featureKey: string;
	/**
	 * How many documents. A hold found with a `limit(1)` probe reports 1 and
	 * sets `atLeast`: the page says "in use", not a number it made up.
	 */
	count: number;
	/** Whether `count` is only a floor — "at least this many". */
	atLeast?: boolean;
}

/** Everything that holds one entity, told apart by what can be done about it. */
export interface EntityUsage {
	/** Holds that refuse the delete; empty means nothing stands in the way. */
	blocking: EntityUsageHold[];
	/** Holds that are deleted along with the entity. */
	cascading: EntityUsageHold[];
}

/** Nothing else's hold on it: the entity can be deleted for good. */
export function isDeletable(usage: EntityUsage): boolean {
	return usage.blocking.length === 0;
}

/** Nothing holds it at all — neither another's nor its own. */
export const EMPTY_ENTITY_USAGE: EntityUsage = { blocking: [], cascading: [] };
