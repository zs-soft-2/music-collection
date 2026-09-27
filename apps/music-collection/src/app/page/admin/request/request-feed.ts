import { ReleaseRequestRow } from './release-request.mapper';
import { RequestRow } from './request-admin.mapper';

/** Which kind of request the list shows. */
export type KindFilter = 'all' | 'catalog' | 'release';

/** How many requests there are of each kind, for the chips. */
export type KindCounts = Record<KindFilter, number>;

/**
 * One entry of the mixed list.
 *
 * The two kinds stay whole rather than being flattened into a shape that
 * fits both: they are decided differently — one field by field, the other by
 * importing a pressing — and a row that had lost the difference would have
 * to guess it back before it could show the right buttons.
 */
export type RequestFeedEntry =
	| { kind: 'catalog'; id: string; createdAt: number; row: RequestRow }
	| {
			kind: 'release';
			id: string;
			createdAt: number;
			row: ReleaseRequestRow;
	  };

/**
 * The two kinds in one list, newest first.
 *
 * An admin works through what came in, not through what collection it landed
 * in, so the order is the order they were asked in and the kind is a label on
 * the card.
 */
export function toRequestFeed(
	catalogRows: RequestRow[],
	releaseRows: ReleaseRequestRow[]
): RequestFeedEntry[] {
	return [
		...catalogRows.map((row): RequestFeedEntry => ({
			kind: 'catalog',
			id: row.id,
			createdAt: row.createdAt,
			row,
		})),
		...releaseRows.map((row): RequestFeedEntry => ({
			kind: 'release',
			id: row.id,
			createdAt: row.createdAt,
			row,
		})),
	].sort((one, other) => other.createdAt - one.createdAt);
}
