/**
 * Who a document belongs to.
 *
 * The shared catalog belongs to everybody and carries `GLOBAL_OWNER_ID`;
 * what a collector creates for themselves carries their own uid and lives
 * under `user/{uid}`. Documents written before the field existed have no
 * `meta` at all — `ownerIdOf` reads those as global, which is what they are,
 * so nothing has to be backfilled and no bundle has to be rebuilt for the
 * field to mean something.
 */
export interface Meta {
	lastUpdated?: string;
	/** `GLOBAL_OWNER_ID`, or the uid of the collector who created it. */
	ownerId?: string;
}

/** The owner of the shared catalog: what belongs to everybody. */
export const GLOBAL_OWNER_ID = 'GLOBAL';

/**
 * Who the document belongs to. One written before the catalog had owners
 * belongs to the catalog, which is what the missing field reads as.
 */
export const ownerIdOf = (entity: { meta?: Meta } | null | undefined): string =>
	entity?.meta?.ownerId ?? GLOBAL_OWNER_ID;

/**
 * Whether the document is part of the shared catalog — what may be counted,
 * scored and offered to everybody. What a collector made for themselves is
 * theirs to keep, and nothing it is on may earn a point.
 */
export const isGlobalEntity = (
	entity: { meta?: Meta } | null | undefined
): boolean => ownerIdOf(entity) === GLOBAL_OWNER_ID;

/** The document stamped with its owner, keeping whatever else `meta` holds. */
export const withOwner = <T extends object>(
	data: T,
	ownerId: string
): T & { meta: Meta } => ({
	...data,
	meta: { ...(data as { meta?: Meta }).meta, ownerId },
});
