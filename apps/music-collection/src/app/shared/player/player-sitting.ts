import type { PlayerSource } from '../../data/player';
import type { PlayLogEntry } from '../../data/play-log';

import type { Listening } from './player-request';

/**
 * Below this much actually played, a record was not listened to — it was
 * passed over on the way to another one, and the log stays quiet about it.
 */
export const MIN_SITTING_MS = 30_000;

/**
 * One sitting with one album, while it lasts. Only what the player itself
 * put on is followed: an album started on the phone is Spotify's own history
 * to keep, and the app does not know which record of the catalog it is.
 */
export interface Sitting {
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	artistId: string | null;
	source: PlayerSource;
	startedAt: number;
	trackCount: number;
	/** Tracks of the album heard, by id. */
	heard: Set<string>;
	/** Milliseconds played, of the spans that have ended. */
	playedMs: number;
	/** When the span playing now began; null while it is paused. */
	playingSince: number | null;
	/** When it last played. */
	endedAt: number;
}

/** Milliseconds heard, the open span included. */
export const heardMs = (sitting: Sitting, at: number): number =>
	sitting.playedMs +
	(sitting.playingSince !== null ? at - sitting.playingSince : 0);

/** The sitting as the log keeps it. */
export const toLogEntry = (sitting: Sitting, at: number): PlayLogEntry => ({
	uid: `${sitting.albumId}-${sitting.startedAt}`,
	albumId: sitting.albumId,
	albumTitle: sitting.albumTitle,
	artistName: sitting.artistName,
	source: sitting.source,
	startedAt: sitting.startedAt,
	endedAt: sitting.playingSince !== null ? at : sitting.endedAt,
	playedMs: heardMs(sitting, at),
	playedTracks: sitting.heard.size,
	trackCount: sitting.trackCount,
	completed:
		sitting.trackCount > 0 && sitting.heard.size >= sitting.trackCount,
});

/** A sitting long enough to be written, as the log keeps it. */
export interface SittingToWrite {
	entry: PlayLogEntry;
	/** Our own artist id, which the log entry does not carry. */
	artistId: string | null;
}

/**
 * The album being listened to now, one sitting at a time. It only keeps the
 * count: what is written where, and what follows a finished record, is the
 * player's business.
 */
export class SittingLog {
	private sitting: Sitting | null = null;

	/** A sitting is open with another record than this one (or than none). */
	isWithOther(albumId: string | null): boolean {
		return !!this.sitting && this.sitting.albumId !== albumId;
	}

	/** Ends the span playing now, if one is. */
	pause(at: number): void {
		const sitting = this.sitting;

		if (sitting && sitting.playingSince !== null) {
			sitting.playedMs += at - sitting.playingSince;
			sitting.playingSince = null;
			sitting.endedAt = at;
		}
	}

	/**
	 * Follows what is heard of the record: opens the sitting with it where
	 * none is open, and counts the span and the track playing.
	 */
	hear(heard: Listening, at: number): void {
		this.sitting ??= {
			albumId: heard.request.albumId,
			albumTitle: heard.request.albumTitle,
			artistName: heard.request.artistName,
			artistId: heard.request.artistId,
			source: heard.source,
			startedAt: at,
			trackCount: heard.request.tracks.length,
			heard: new Set<string>(),
			playedMs: 0,
			playingSince: null,
			endedAt: at,
		};
		const sitting = this.sitting;

		if (heard.playing) {
			sitting.playingSince ??= at;
			sitting.endedAt = at;
			if (heard.trackId) {
				sitting.heard.add(heard.trackId);
			}
		} else {
			this.pause(at);
		}
	}

	/**
	 * The sitting as it is to be written now, and null where there is none or
	 * it is too short to count. `end` leaves it behind (the album is over);
	 * without it the same document is written again as the record plays on —
	 * the id holds the moment it started, so the two are one play, not two.
	 */
	take(end: boolean, at: number): SittingToWrite | null {
		const done = this.sitting;

		if (end) {
			this.sitting = null;
		}
		if (!done || heardMs(done, at) < MIN_SITTING_MS) {
			return null;
		}

		return { entry: toLogEntry(done, at), artistId: done.artistId };
	}
}
