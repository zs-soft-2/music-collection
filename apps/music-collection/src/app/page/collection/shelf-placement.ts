import {
	CollectionItemPlacement,
	MAX_SHELF_POSITION,
	ShelfSpot,
	nextPosition,
	placementKey,
	placementInLayout,
	spotKey,
	unitSpots,
} from '@music-collection/api';

import { ReleaseView } from '../../shared/music-ui';

import { ShelfSpotRef } from './collection.model';

/**
 * Filing a copy by hand: which drawn unit, which compartment of it, and how
 * far along that compartment. The placement itself lives on the collection
 * item, and what reads it back against the drawn furniture is shared with
 * the form that files a single copy (`@music-collection/api`); what is here
 * is what the shelf page does with it when a record is dragged across it.
 */

export type { ShelfSpot };
export {
	MAX_SHELF_POSITION,
	nextPosition,
	placementInLayout,
	placementKey,
	spotKey,
	unitSpots,
};

/** The same compartment, the same distance along it. */
export function samePlace(
	a: CollectionItemPlacement | null | undefined,
	b: CollectionItemPlacement | null | undefined
): boolean {
	return a && b
		? a.unitId === b.unitId &&
				a.row === b.row &&
				a.column === b.column &&
				a.position === b.position
		: !a && !b;
}

/**
 * The places a drop gives a compartment. Every record the compartment shows
 * is filed, not only the dropped one: the collector arranged what they saw,
 * and a place given to one record alone would leave the shelf free to
 * reshuffle its neighbours around it.
 *
 * Only what actually moves comes back, so re-dropping a record where it
 * already stands writes nothing.
 */
export function placementsForDrop(
	shown: readonly ReleaseView[],
	moved: ReleaseView,
	spot: ShelfSpotRef,
	index: number
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const rest = shown.filter((release) => release.id !== moved.id);
	const at = Math.max(0, Math.min(index, rest.length));
	const order = [...rest.slice(0, at), moved, ...rest.slice(at)].slice(
		0,
		MAX_SHELF_POSITION
	);

	return order
		.map((release, position) => ({
			releaseId: release.id,
			placement: { ...spot, position: position + 1 },
			was: release.placement,
		}))
		.filter(({ placement, was }) => !samePlace(was, placement))
		.map(({ releaseId, placement }) => ({ releaseId, placement }));
}

/**
 * The places the compartment a record was taken out of keeps for itself, so
 * the gap the record leaves stays a gap.
 *
 * A compartment the shelf packed itself is packed again the moment anything
 * leaves it, and the next record along slides into the space that opened —
 * the very space the collector made room with. Taking a record out of such a
 * compartment therefore hands the rest of it to the collector too: from then
 * on it holds what they left in it, be that thirty-five records or ten, and
 * nothing the shelf decides puts another one back.
 *
 * A compartment already filed by hand needs none of this. Its records keep
 * the places they were given, hole in the numbering and all, so nothing is
 * written for them.
 */
export function placementsLeftBehind(
	shown: readonly ReleaseView[],
	moved: ReleaseView,
	spot: ShelfSpotRef
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const key = spotKey(spot.unitId, spot.row, spot.column);
	const stays = shown.filter((release) => release.id !== moved.id);
	const theirs = (release: ReleaseView) =>
		!!release.placement && placementKey(release.placement) === key;

	if (stays.every(theirs)) {
		return [];
	}

	return stays
		.slice(0, MAX_SHELF_POSITION)
		.map((release, index) => ({
			releaseId: release.id,
			placement: { ...spot, position: index + 1 },
			was: release.placement,
		}))
		.filter(({ placement, was }) => !samePlace(was, placement))
		.map(({ releaseId, placement }) => ({ releaseId, placement }));
}
