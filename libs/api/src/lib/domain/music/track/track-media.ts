import { DocumentEntity } from '../../document';
import type { TrackDocument } from './track';

/**
 * What a song's media costs, how it is ordered and where it got to: the
 * pictures a model draws for it, and the short clip made from the song.
 *
 * Both go through the AI gateway, and both end up as documents over files,
 * the way every other picture in the catalog does. Video runs there as an
 * execution: the call comes back with an id in a second or two and the clip
 * itself lands minutes later. Hence the shapes here — what it would cost
 * before anybody spends it, what is being made, and what is finished.
 *
 * Ordering belongs to whoever may edit the track, the same permission the
 * links and the lyrics are written with. The prompt is written on the
 * server from the song and its words; the caller may add a short line of
 * direction and pick a model, and nothing else.
 */

/**
 * A finished clip, as the track document carries it.
 *
 * The same wrapper as a picture (`TrackDocument`), carrying its own
 * category: a document over the file, with the name and the address on it.
 * A video is not a picture, but it is just as much a file somebody has to
 * find again — the document library lists it under `track-clip`, and
 * nothing of ours ever points at a bucket path nobody filed.
 */
export interface TrackClip extends TrackDocument {
	/** What it runs for, as the model reported it. */
	durationSeconds: number | null;
	/** The video's own type, which the wrapper leaves off. */
	mimeType: string | null;
	/** The gateway execution that made it — the thread back to its logs. */
	executionId: string;
	/** The model the gateway routed to, where it says. */
	model: string | null;
	/** What the model was told to make. Kept so a reader can judge it. */
	prompt: string;
	/** Epoch milliseconds. */
	createdAt: number;
}

/** Where a clip being made stands. `none` means nobody has asked for one. */
export type TrackClipStatus =
	'none' | 'queued' | 'running' | 'succeeded' | 'failed';

/** What the page shows about the clip of one song. */
export interface TrackClipState {
	status: TrackClipStatus;
	/** The gateway execution, while there is one. */
	executionId: string | null;
	/** The prompt the clip is being made from, once it is written. */
	prompt: string | null;
	/** Why it failed, in a sentence; null otherwise. */
	error: string | null;
	/** The finished clip, when there is one. */
	clip: TrackClip | null;
	/** Clips left in today's allowance, after this call. */
	remainingToday: number | null;
}

/** What one clip would cost, before anybody spends it. */
export interface TrackClipEstimate {
	costUsd: number | null;
	currency: string;
	model: string | null;
	/** Clips left in today's allowance. */
	remainingToday: number;
}

/**
 * A model this tenant may draw with, as the gateway's catalogue names it.
 *
 * The list comes from the gateway rather than from a constant here: what a
 * tenant is entitled to changes without this app being rebuilt, and a picker
 * built from a hard-coded list would offer models nobody can call.
 */
export interface TrackImageModel {
	id: string;
	provider: string | null;
	/** What to show in the picker. */
	label: string;
}

/** The picture a model drew, and what is left of today's allowance. */
export interface TrackImageResult {
	image: DocumentEntity & { width?: number | null; height?: number | null };
	prompt: string;
	model: string | null;
	remainingToday: number;
}

export type TrackMediaAction =
	'estimate' | 'start' | 'status' | 'models' | 'image';

export interface TrackMediaRequest {
	trackUid: string;
	action: TrackMediaAction;
	/**
	 * Which price bracket to run at. The gateway picks the model unless one
	 * is named, and leaving this out leaves the bracket to it too — which is
	 * what a caller with no opinion should do. A bracket the gateway has no
	 * model assigned to is refused outright (`QUALITY_PROFILE_UNAVAILABLE`),
	 * never quietly served from a dearer one, so naming one is a claim that
	 * it is configured there.
	 */
	qualityProfile?: 'economy' | 'normal' | 'premium';
	/** The model to draw with, from the `models` action's list. */
	model?: string;
	/**
	 * A short line of direction for a drawn picture — "a rainy street at
	 * night", say. The song, the style and everything else come from the
	 * server; this only nudges.
	 */
	hint?: string;
}

/** How long a line of direction may be. The rest of the prompt is ours. */
export const MAX_TRACK_IMAGE_HINT = 200;

/**
 * One callable answers all of it. On purpose: every function takes a slice
 * of the region's CPU quota, and a price, a drawing, a start and a poll are
 * the same conversation about the same song.
 */
export const TRACK_MEDIA_FUNCTION = 'generateTrackMedia';
