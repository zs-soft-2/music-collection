import {
	CollectionItemPlacement,
	ShelfMediaSize,
	ShelfSpot,
	maxPositionIn,
	nextPosition,
	placementKey,
	placementInLayout,
	shelfCopySize,
	spotKey,
	unitSpots,
} from '@music-collection/api';

import { ReleaseView } from '../../shared/music-ui';

import { ShelfCompartmentView, ShelfSpotRef } from './collection.model';

/**
 * Filing a copy by hand: which drawn unit, which compartment of it, and how
 * far along that compartment. The placement itself lives on the collection
 * item, and what reads it back against the drawn furniture is shared with
 * the form that files a single copy (`@music-collection/api`); what is here
 * is what the shelf page does with it when a record is dragged across it.
 */

export type { ShelfSpot };
export {
	maxPositionIn,
	nextPosition,
	placementInLayout,
	placementKey,
	spotKey,
	unitSpots,
};

/**
 * How much room this copy takes on a shelf. A release filed as a box set —
 * or only tagged as one — is measured as the slab it is, however its medium
 * is recorded, which is the same rule the shelf draws its spines by.
 *
 * Everything else is its medium plus its packaging, read off the edition
 * tags the pressing carries. A record is not one width in a real room, and
 * the ones the catalog knows about are the ones it can show: a gatefold
 * jacket, a deluxe edition, a heavy pressing. An untagged copy stands at the
 * plain width rather than at a made-up one.
 */
export function shelfSizeOf(release: ReleaseView): ShelfMediaSize {
	return shelfCopySize(release.format, {
		boxSet: release.boxSet,
		gatefold: release.editions.includes('gatefold'),
		deluxe: release.editions.includes('deluxe edition'),
		heavy: release.weight !== null,
	});
}

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
	index: number,
	/** The furthest along this compartment a copy can be filed. */
	max: number
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const rest = shown.filter((release) => release.id !== moved.id);
	const at = Math.max(0, Math.min(index, rest.length));
	const order = [...rest.slice(0, at), moved, ...rest.slice(at)].slice(
		0,
		max
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
	spot: ShelfSpotRef,
	/** The furthest along this compartment a copy can be filed. */
	max: number
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const key = spotKey(spot.unitId, spot.row, spot.column);
	const stays = shown.filter((release) => release.id !== moved.id);
	const theirs = (release: ReleaseView) =>
		!!release.placement && placementKey(release.placement) === key;

	if (stays.every(theirs)) {
		return [];
	}

	return stays
		.slice(0, max)
		.map((release, index) => ({
			releaseId: release.id,
			placement: { ...spot, position: index + 1 },
			was: release.placement,
		}))
		.filter(({ placement, was }) => !samePlace(was, placement))
		.map(({ releaseId, placement }) => ({ releaseId, placement }));
}

/**
 * Every record on the shelf given the place it already appears to have.
 *
 * This is what "keep it as it stands" writes. Until a record is filed, the
 * shelf packs it afresh on every draw, so a record joining the collection —
 * or leaving it — shifts everything after it, compartments and all. Writing
 * the arrangement down ends that: from then on each record is where its
 * owner last saw it, and only they move it.
 *
 * Compartments that are not drawn furniture (the open wall, and the
 * overflow of what no longer fits) are left out: there is no compartment to
 * name, and a record there is precisely one the shelf has no room for.
 *
 * Only what actually changes comes back, so running it twice writes nothing
 * the second time.
 */
export function placementsToFreeze(
	shelves: readonly { compartments: readonly ShelfCompartmentView[] }[]
): { releaseId: string; placement: CollectionItemPlacement }[] {
	return shelves
		.flatMap((shelf) => shelf.compartments)
		.filter((compartment) => !!compartment.spot)
		.flatMap((compartment) =>
			compartment.items.map((release, index) => ({
				releaseId: release.id,
				placement: {
					...(compartment.spot as ShelfSpotRef),
					position: index + 1,
				},
				was: release.placement,
			}))
		)
		.filter(({ placement, was }) => !samePlace(was, placement))
		.map(({ releaseId, placement }) => ({ releaseId, placement }));
}

/**
 * Every record that holds a place, handed back to the shelf.
 *
 * The way out of a frozen shelf: the placements are dropped, and the packing
 * takes over again. Only records that have a place are named, so nothing is
 * written for a shelf that was never frozen.
 */
export function placementsToRelease(
	releases: readonly ReleaseView[]
): { releaseId: string; placement: null }[] {
	return releases
		.filter((release) => !!release.placement)
		.map((release) => ({ releaseId: release.id, placement: null }));
}
