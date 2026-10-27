/**
 * The catalog bundles as the admin page sees them — the shapes the
 * `catalogBundleStatusNow` and `rebuildCatalogBundle` callables return
 * (apps/functions/src/catalog-bundles.ts).
 */

/** Callable names. */
export const CATALOG_BUNDLE_STATUS_FUNCTION = 'catalogBundleStatusNow';
export const REBUILD_CATALOG_BUNDLE_FUNCTION = 'rebuildCatalogBundle';

/**
 * How long a rebuild may take before the client stops waiting: the
 * function's own limit. A genre bundle reads the whole catalog, and the
 * callable's default of seventy seconds would give up on it while the
 * server was still building.
 */
export const REBUILD_TIMEOUT_MS = 540_000;

/**
 * - `feature`: every document of one feature, for the administrator;
 * - `genre`: one genre's slice, for a collector following it;
 * - `guest`: the weekly showcase, for everybody following no genre.
 */
export type CatalogBundleKind = 'feature' | 'genre' | 'guest';

export interface CatalogBundleStatus {
	kind: CatalogBundleKind;
	/** The feature key, the genre slug, or `guest`. */
	key: string;
	/** The genre's name; null for the other kinds. */
	name: string | null;
	/** Null while it was never published. */
	path: string | null;
	count: number;
	/** Epoch ms. */
	builtAt: number | null;
	/** Epoch ms: writes after this are changes. */
	modifiedAt: number | null;
	/** Documents written since, in the bundle's features. */
	changed: number;
	/** Documents deleted since. */
	deleted: number;
	/** Built before a reset: the clients ignore it until it is rebuilt. */
	outdatedByReset: boolean;
	/** About how many document reads a rebuild costs. */
	readCost: number;
	/** The showcase's week; null for the other kinds. */
	week: string | null;
}

export interface CatalogBundleRebuildResult {
	kind: CatalogBundleKind;
	key: string;
	path: string | null;
	count: number;
	bytes: number;
	collections: number | null;
}

/** What a bundle's row asks of the administrator. */
export type CatalogBundleState = 'missing' | 'reset' | 'behind' | 'current';

/**
 * Whether a bundle wants rebuilding, and how urgently.
 *
 * A reset outranks everything: the clients have stopped trusting that
 * bundle and download the feature a document at a time. Changes are a cost
 * every cold client pays on top of the bundle; none at all is current.
 */
export function catalogBundleState(
	bundle: CatalogBundleStatus
): CatalogBundleState {
	if (!bundle.path) {
		return 'missing';
	}
	if (bundle.outdatedByReset) {
		return 'reset';
	}

	return bundle.changed + bundle.deleted > 0 ? 'behind' : 'current';
}

/** The row's identity, for tracking and for the rebuild in progress. */
export const catalogBundleId = (
	bundle: Pick<CatalogBundleStatus, 'kind' | 'key'>
): string => `${bundle.kind}:${bundle.key}`;
