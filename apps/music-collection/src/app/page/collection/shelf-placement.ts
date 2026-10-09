import {
	CollectionItemPlacement,
	ShelfMediaSize,
	ShelfSide,
	ShelfSpot,
	ShelfWidths,
	maxPositionIn,
	nextPosition,
	placementAt,
	placementKey,
	placementInLayout,
	placementSide,
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

export type { ShelfSide, ShelfSpot, ShelfWidths };
export {
	maxPositionIn,
	nextPosition,
	placementAt,
	placementInLayout,
	placementKey,
	placementSide,
	spotKey,
	unitSpots,
};

/**
 * How much room this copy takes on a shelf. A release filed as a box set —
 * or only tagged as one — is measured as the slab it is, however its medium
 * is recorded, which is the same rule the shelf draws its spines by.
 *
 * Everything else is its medium plus its packaging, read off the edition
 * tags the pressing carries, at whatever width the collector measured that
 * medium at. A record is not one width in a real room, and
 * the ones the catalog knows about are the ones it can show: a gatefold
 * jacket, a deluxe edition, a heavy pressing. An untagged copy stands at the
 * plain width rather than at a made-up one.
 */
export function shelfSizeOf(
	release: ReleaseView,
	widths?: ShelfWidths
): ShelfMediaSize {
	return shelfCopySize(
		release.format,
		{
			boxSet: release.boxSet,
			gatefold: release.editions.includes('gatefold'),
			deluxe: release.editions.includes('deluxe edition'),
			heavy: release.weight !== null,
		},
		widths
	);
}

/** The same compartment, the same wall of it, the same distance along. */
export function samePlace(
	a: CollectionItemPlacement | null | undefined,
	b: CollectionItemPlacement | null | undefined
): boolean {
	return a && b
		? a.unitId === b.unitId &&
				a.row === b.row &&
				a.column === b.column &&
				placementSide(a) === placementSide(b) &&
				a.position === b.position
		: !a && !b;
}

/**
 * A compartment's two runs, with the records being carried lifted out of
 * whichever run each stood in. `rightFrom` is where the right-hand run
 * begins in the list the compartment is drawn as.
 *
 * A handful of records is lifted the same way one is: the collector picked
 * them out of this compartment, out of several, or out of none of them, and
 * what is left standing here is the same question either way.
 */
function runsWithout(
	shown: readonly ReleaseView[],
	rightFrom: number,
	moved: readonly ReleaseView[]
): { left: ReleaseView[]; right: ReleaseView[] } {
	const lifted = new Set(moved.map((release) => release.id));
	const without = (run: readonly ReleaseView[]) =>
		run.filter((release) => !lifted.has(release.id));

	return {
		left: without(shown.slice(0, rightFrom)),
		right: without(shown.slice(rightFrom)),
	};
}

/**
 * A run of records given their places along one wall, counted from that wall
 * outwards: the left-hand run from its first record, the right-hand run from
 * its last, which is the one standing against the right wall.
 *
 * That is what keeps the far end of a compartment still. A record leaning on
 * the right wall is there because the collector put it there; growing the
 * left-hand run must not renumber it, and this is why it does not.
 */
function runPlacements(
	run: readonly ReleaseView[],
	spot: ShelfSpotRef,
	side: ShelfSide,
	/** The furthest along this compartment a copy can be filed. */
	max: number
): {
	releaseId: string;
	placement: CollectionItemPlacement;
	was: CollectionItemPlacement | null | undefined;
}[] {
	const kept = side === 'left' ? run.slice(0, max) : run.slice(-max);

	return kept.map((release, index) => ({
		releaseId: release.id,
		placement: placementAt(
			spot,
			side,
			side === 'left' ? index + 1 : kept.length - index
		),
		was: release.placement,
	}));
}

/**
 * The places a drop gives a compartment. Every record the compartment shows
 * is filed, not only the dropped one: the collector arranged what they saw,
 * and a place given to one record alone would leave the shelf free to
 * reshuffle its neighbours around it.
 *
 * Both runs are written, whichever wall the record was let go against. A
 * compartment the shelf had packed itself has no places in it at all, and
 * one handed out to the right-hand run alone would leave the left free to be
 * repacked around it.
 *
 * A whole armful of records goes in the way one does: they are put down in
 * the order they stood in, side by side at the point they were let go, so a
 * run carried across keeps the order its owner gave it.
 *
 * Only what actually moves comes back, so re-dropping a record where it
 * already stands writes nothing.
 */
export function placementsForDrop(
	shown: readonly ReleaseView[],
	/** Where the right-hand run begins in `shown`. */
	rightFrom: number,
	/** What is being carried, in the order it is to stand. */
	moved: readonly ReleaseView[],
	spot: ShelfSpotRef,
	/** The wall it was let go against. */
	side: ShelfSide,
	/** Where among the records already standing against that wall. */
	index: number,
	/** The furthest along this compartment a copy can be filed. */
	max: number
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const runs = runsWithout(shown, rightFrom, moved);
	const run = runs[side];
	const at = Math.max(0, Math.min(index, run.length));

	runs[side] = [...run.slice(0, at), ...moved, ...run.slice(at)];

	return [
		...runPlacements(runs.left, spot, 'left', max),
		...runPlacements(runs.right, spot, 'right', max),
	]
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
	/** Where the right-hand run begins in `shown`. */
	rightFrom: number,
	/** What was taken out of this compartment; one record, or an armful. */
	moved: readonly ReleaseView[],
	spot: ShelfSpotRef,
	/** The furthest along this compartment a copy can be filed. */
	max: number
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const key = spotKey(spot.unitId, spot.row, spot.column);
	const lifted = new Set(moved.map((release) => release.id));
	const stays = shown.filter((release) => !lifted.has(release.id));
	const theirs = (release: ReleaseView) =>
		!!release.placement && placementKey(release.placement) === key;

	if (stays.every(theirs)) {
		return [];
	}

	const runs = runsWithout(shown, rightFrom, moved);

	return [
		...runPlacements(runs.left, spot, 'left', max),
		...runPlacements(runs.right, spot, 'right', max),
	]
		.filter(({ placement, was }) => !samePlace(was, placement))
		.map(({ releaseId, placement }) => ({ releaseId, placement }));
}

/**
 * Everything one move writes: the compartment the records were put down in,
 * and every compartment they came out of.
 *
 * An armful can be gathered from anywhere — three compartments, two units —
 * so what a move leaves behind is not one compartment but all of them, each
 * given the places that keep the gap the records left. The compartment they
 * landed in is arranged last and wins, which is what lets a record be
 * carried from a compartment back into the same one.
 */
export function placementsForMove(
	/** Every drawn compartment the shelf shows, the target among them. */
	cells: readonly ShelfCompartmentView[],
	/** The one the records were put down in; one of `cells`. */
	into: ShelfCompartmentView,
	/** Which drawn compartment that is. */
	spot: ShelfSpotRef,
	/** What was carried, in the order it is to stand. */
	moved: readonly ReleaseView[],
	/** The wall it was let go against, and where along that wall. */
	at: { side: ShelfSide; index: number },
	/** The furthest along a compartment of that unit a copy can be filed. */
	furthestIn: (unitId: string) => number
): { releaseId: string; placement: CollectionItemPlacement }[] {
	const carried = new Set(moved.map((release) => release.id));
	const from = cells.filter(
		(cell) =>
			cell !== into &&
			!!cell.spot &&
			cell.items.some((release) => carried.has(release.id))
	);

	return [
		...from.flatMap((cell) =>
			cell.spot
				? placementsLeftBehind(
						cell.items,
						cell.rightFrom,
						/* What this one lost, not the whole armful. */
						moved.filter((release) =>
							cell.items.some((stood) => stood.id === release.id)
						),
						cell.spot,
						furthestIn(cell.spot.unitId)
					)
				: []
		),
		...placementsForDrop(
			into.items,
			into.rightFrom,
			moved,
			spot,
			at.side,
			at.index,
			furthestIn(spot.unitId)
		),
	];
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
		.flatMap((compartment) => {
			const spot = compartment.spot as ShelfSpotRef;
			const { items, rightFrom } = compartment;

			return [
				...runPlacements(
					items.slice(0, rightFrom),
					spot,
					'left',
					items.length
				),
				...runPlacements(
					items.slice(rightFrom),
					spot,
					'right',
					items.length
				),
			];
		})
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
