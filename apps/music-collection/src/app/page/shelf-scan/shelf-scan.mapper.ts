/**
 * A photographed shelf, turned into the table the collector reviews.
 *
 * Each spine becomes one row, and each row has to answer two questions: what
 * does the app think this record is, and where does it stand in the catalog.
 * The second one is not decided here — `toCandidateView` already knows the
 * four states and has to keep being the only thing that does, so a spine is
 * dressed as a candidate and handed to it.
 */

import {
	AlbumEntity,
	CollectionItemEntity,
	PhotoMedia,
	ReleaseEntity,
	ReleaseRequestAdd,
	ScanCandidate,
	ShelfScanSpine,
	SpineField,
} from '@music-collection/api';

import { ScanState, toCandidateView } from '../scan/scan.mapper';

export { STATE_LABELS } from '../scan/scan.mapper';

/** What the collector changed on a row, by field. */
export type SpineEdit = Partial<
	Pick<
		ShelfScanSpine,
		'artist' | 'albumTitle' | 'label' | 'catalogNumber' | 'year'
	>
>;

export interface ShelfRow {
	/** Position in the compartment, from 1; the row's identity. */
	position: number;
	artist: string | null;
	albumTitle: string | null;
	label: string | null;
	catalogNumber: string | null;
	year: number | null;
	media: PhotoMedia | null;
	/** Nothing could be read off this spine — it needs filling in. */
	unreadable: boolean;
	/** Fields the two photos read differently; empty when they agreed. */
	conflicts: SpineField[];
	alternatives: ShelfScanSpine['alternatives'];
	/** How many photos this spine appeared on. */
	seenOn: number;
	confidence: ShelfScanSpine['confidence'];
	/** The collector touched this field; the conflict on it is settled. */
	edited: SpineField[];
	state: ScanState;
	albumUid: string | null;
	artistUid: string | null;
	releaseUid: string | null;
	/** Enough to look the record up at all. */
	identifiable: boolean;
}

const EDITABLE: SpineField[] = [
	'artist',
	'albumTitle',
	'label',
	'catalogNumber',
	'year',
];

/** The row's own reading: what the model said, with the edits on top. */
function applyEdit(spine: ShelfScanSpine, edit: SpineEdit): ShelfScanSpine {
	return { ...spine, ...edit };
}

/**
 * The spine as the catalog matcher sees it. No Discogs ids — a spine has
 * none — so the match runs on the catalog number and on artist and title,
 * which is exactly what the printed spine offers.
 */
function toCandidate(spine: ShelfScanSpine): ScanCandidate {
	return {
		discogsReleaseId: null,
		discogsMasterId: null,
		title: spine.albumTitle ?? '',
		artistName: spine.artist,
		albumName: spine.albumTitle,
		formats: spine.media ? [spine.media] : [],
		label: spine.label,
		catno: spine.catalogNumber,
		country: spine.country,
		year: spine.year,
		thumbUrl: null,
		match: spine.catalogNumber ? 'likely' : 'possible',
	};
}

export function toShelfRow(
	spine: ShelfScanSpine,
	edit: SpineEdit,
	catalog: {
		albums: AlbumEntity[];
		releases: ReleaseEntity[];
		ownedItems: CollectionItemEntity[];
	}
): ShelfRow {
	const read = applyEdit(spine, edit);
	const view = toCandidateView(toCandidate(read), catalog);
	const edited = EDITABLE.filter((field) => field in edit);

	return {
		position: spine.position,
		artist: read.artist,
		albumTitle: read.albumTitle,
		label: read.label,
		catalogNumber: read.catalogNumber,
		year: read.year,
		media: read.media,
		// An edited spine is no longer unreadable, whatever the model said.
		unreadable: read.unreadable && !edited.length,
		// A field the collector settled is not in dispute any more.
		conflicts: spine.conflicts.filter(
			(field) => !edited.includes(field as SpineField)
		),
		alternatives: spine.alternatives,
		seenOn: spine.seenOn,
		confidence: read.confidence,
		edited,
		state: view.state,
		albumUid: view.albumUid,
		artistUid: view.artistUid,
		releaseUid: view.releaseUid,
		identifiable: !!(read.albumTitle || read.catalogNumber),
	};
}

export function toShelfRows(
	spines: ShelfScanSpine[],
	edits: Record<number, SpineEdit>,
	catalog: {
		albums: AlbumEntity[];
		releases: ReleaseEntity[];
		ownedItems: CollectionItemEntity[];
	}
): ShelfRow[] {
	return spines.map((spine) =>
		toShelfRow(spine, edits[spine.position] ?? {}, catalog)
	);
}

/**
 * What the collector asks the admin for, taken from a reviewed row. The
 * pressing carries what was read off the spine — the server searches the
 * Discogs with it when the request is submitted, so a corrected catalog
 * number is what that search runs on.
 */
export function toShelfRequest(
	row: ShelfRow,
	userId: string
): ReleaseRequestAdd {
	return {
		userId,
		album: {
			uid: row.albumUid,
			name: row.albumTitle ?? '',
			artistUid: row.artistUid,
			artistName: row.artist,
		},
		status: 'pending',
		discogsMasterId: null,
		discogsReleaseId: null,
		pressing: {
			format: row.media,
			label: row.label,
			catno: row.catalogNumber,
			country: null,
			year: row.year,
		},
		note: null,
		createdAt: Date.now(),
	};
}
