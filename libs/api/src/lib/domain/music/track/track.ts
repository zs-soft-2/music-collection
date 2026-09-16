import { Entity } from '../../../common';

/** One track of an album, in play order (imported from Discogs). */
export interface Track {
	albumUid: string;
	/** Play order, 1-based. */
	index: number;
	/** Position as printed on the release, e.g. "A1", "2-03". */
	position: string | null;
	name: string;
	/** Duration as printed, e.g. "4:04". */
	duration: string | null;
	durationSec: number | null;
	/** Section heading the track belongs to, e.g. "Bonus Tracks". */
	heading: string | null;
	source?: string;
}

export type TrackEntity = Track & Entity;
