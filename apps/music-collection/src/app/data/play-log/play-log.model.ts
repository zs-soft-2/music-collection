import { PlayerSource } from '../player';

export const PLAY_LOG_FEATURE_KEY = 'play-log';

/**
 * One sitting with one album: what was put on, when, and how much of it was
 * heard. Spotify counts plays for the account and YouTube counts them for
 * nobody; this counts them for the record — which is the only place a
 * collector's listening belongs.
 */
export interface PlayLogEntry {
	/** `{albumId}-{startedAt}`: the same sitting written twice overwrites. */
	uid: string;
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	source: PlayerSource;
	/** Epoch milliseconds the album was put on. */
	startedAt: number;
	/** Epoch milliseconds of the last thing heard from it. */
	endedAt: number;
	/** Milliseconds actually played, pauses left out. */
	playedMs: number;
	/** Tracks of the album heard, of `trackCount`. */
	playedTracks: number;
	trackCount: number;
	/** Every track of the album was heard: the record went round once. */
	completed: boolean;
}

/** What a page says about one album's listening. */
export interface AlbumListening {
	/** Sittings with the album. */
	plays: number;
	/** Of those, the ones that went through the whole record. */
	fullPlays: number;
	/** Epoch milliseconds it was last put on; null when it never was. */
	lastPlayedAt: number | null;
}

const EMPTY_LISTENING: AlbumListening = {
	plays: 0,
	fullPlays: 0,
	lastPlayedAt: null,
};

/** The log read back per album. */
export function listeningByAlbum(
	entries: readonly PlayLogEntry[]
): Map<string, AlbumListening> {
	const byAlbum = new Map<string, AlbumListening>();

	for (const entry of entries) {
		const held = byAlbum.get(entry.albumId) ?? EMPTY_LISTENING;

		byAlbum.set(entry.albumId, {
			plays: held.plays + 1,
			fullPlays: held.fullPlays + (entry.completed ? 1 : 0),
			lastPlayedAt: Math.max(held.lastPlayedAt ?? 0, entry.startedAt),
		});
	}

	return byAlbum;
}

/** One album's listening, without walking the whole log into a map. */
export function listeningFor(
	entries: readonly PlayLogEntry[],
	albumId: string | null
): AlbumListening {
	if (!albumId) {
		return EMPTY_LISTENING;
	}

	return entries
		.filter((entry) => entry.albumId === albumId)
		.reduce<AlbumListening>(
			(held, entry) => ({
				plays: held.plays + 1,
				fullPlays: held.fullPlays + (entry.completed ? 1 : 0),
				lastPlayedAt: Math.max(held.lastPlayedAt ?? 0, entry.startedAt),
			}),
			EMPTY_LISTENING
		);
}

/** One record in the listening summary's ranking. */
export interface ListenedRecord {
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	plays: number;
	fullPlays: number;
}

/** What the collector's listening adds up to. */
export interface ListeningSummary {
	/** Sittings with a record. */
	plays: number;
	/** Of those, the ones that went through the whole record. */
	fullPlays: number;
	/** Records put on at least once. */
	records: number;
	/** Sittings since the first of January. */
	playsThisYear: number;
	/** Hours actually played, to one decimal. */
	hours: number;
	/** The records put on most, the most played first. */
	top: ListenedRecord[];
}

/** How many records the ranking names. */
const TOP_COUNT = 5;

/** The whole log as one picture of the collector's listening. */
export function summariseListening(
	entries: readonly PlayLogEntry[],
	now = Date.now()
): ListeningSummary {
	const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
	const byAlbum = new Map<
		string,
		ListenedRecord & { lastPlayedAt: number }
	>();
	let playedMs = 0;
	let fullPlays = 0;
	let playsThisYear = 0;

	for (const entry of entries) {
		playedMs += entry.playedMs;
		fullPlays += entry.completed ? 1 : 0;
		playsThisYear += entry.startedAt >= yearStart ? 1 : 0;

		const held = byAlbum.get(entry.albumId);

		byAlbum.set(entry.albumId, {
			albumId: entry.albumId,
			// The last sitting names the record: a title corrected in the
			// catalog should not be held to what it was called years ago.
			albumTitle:
				!held || entry.startedAt >= held.lastPlayedAt
					? entry.albumTitle
					: held.albumTitle,
			artistName:
				!held || entry.startedAt >= held.lastPlayedAt
					? entry.artistName
					: held.artistName,
			plays: (held?.plays ?? 0) + 1,
			fullPlays: (held?.fullPlays ?? 0) + (entry.completed ? 1 : 0),
			lastPlayedAt: Math.max(held?.lastPlayedAt ?? 0, entry.startedAt),
		});
	}

	const top = [...byAlbum.values()]
		.sort((a, b) => b.plays - a.plays || b.lastPlayedAt - a.lastPlayedAt)
		.slice(0, TOP_COUNT)
		.map(({ albumId, albumTitle, artistName, plays, fullPlays: full }) => ({
			albumId,
			albumTitle,
			artistName,
			plays,
			fullPlays: full,
		}));

	return {
		plays: entries.length,
		fullPlays,
		records: byAlbum.size,
		playsThisYear,
		hours: Math.round(playedMs / 360_000) / 10,
		top,
	};
}
