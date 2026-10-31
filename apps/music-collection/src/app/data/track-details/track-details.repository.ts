import {
	Observable,
	catchError,
	finalize,
	map,
	of,
	retry,
	shareReplay,
	switchMap,
	throwError,
	timer,
} from 'rxjs';

import {
	HttpClient,
	HttpErrorResponse,
	HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DocumentData, Firestore, doc, docData } from '@angular/fire/firestore';
import {
	AuthenticatedUserService,
	FirestoreSyncService,
	TRACK_FEATURE_KEY,
	TRACK_LYRICS_FEATURE_KEY,
	type Track,
	type TrackImage,
	type TrackLyrics,
} from '@music-collection/api';

/** Fields of a track editable by hand. */
export type TrackLinksUpdate = Pick<
	Track,
	'spotifyTrackId' | 'youtubeVideoId' | 'writers'
>;

/** Search terms for looking up lyrics on LRCLIB. */
export interface LyricsQuery {
	artistName: string;
	trackName: string;
	albumName: string | null;
	durationSec: number | null;
}

interface LrclibRecord {
	plainLyrics: string | null;
	syncedLyrics: string | null;
	instrumental: boolean;
}

const LRCLIB_URL = 'https://lrclib.net/api';

/**
 * LRCLIB turns requests away with a 503 ("ServerOverloaded") while it is
 * busy, and a moment later serves them, so a busy answer is asked again a
 * couple of times before it counts as a failure.
 */
const LRCLIB_BUSY_RETRIES = 2;
const LRCLIB_BUSY_DELAY_MS = 1500;

/** True when LRCLIB answered that it is too busy to serve the request. */
export const isLyricsServiceBusy = (error: unknown): boolean =>
	error instanceof HttpErrorResponse && error.status === 503;

const retryWhileBusy = <T>() =>
	retry<T>({
		count: LRCLIB_BUSY_RETRIES,
		delay: (error, attempt) =>
			isLyricsServiceBusy(error)
				? timer(attempt * LRCLIB_BUSY_DELAY_MS)
				: throwError(() => error),
	});

const toLyrics = (record: LrclibRecord | undefined): TrackLyrics | null => {
	const text = record?.plainLyrics?.trim();
	return text ? { text, synced: record?.syncedLyrics?.trim() || null } : null;
};

/**
 * Data access for one track's hand-edited details: the links on the track
 * document and the lyrics in `track-lyrics` (signed-in users only).
 */
@Injectable({ providedIn: 'root' })
export class TrackDetailsRepository {
	private readonly firestore = inject(Firestore);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly http = inject(HttpClient);
	/** The shared listener of every track's lyrics being followed. */
	private readonly followedLyrics = new Map<
		string,
		Observable<DocumentData | undefined>
	>();

	/** Null when signed out, missing or not readable. */
	public lyrics$(trackUid: string): Observable<TrackLyrics | null> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user
					? this.followed$(trackUid, user.uid).pipe(
							map((data) => {
								const lyrics = data as TrackLyrics | undefined;
								return lyrics?.text
									? {
											text: lyrics.text,
											synced: lyrics.synced || null,
										}
									: null;
							}),
							catchError((error) => {
								console.warn('Lyrics unavailable', error);
								return of(null);
							})
						)
					: of(null)
			)
		);
	}

	/**
	 * The one listener on a track's lyrics, however many ask for it. The
	 * player follows the lyrics of what is playing and the track page those
	 * of what is open — the same track, most of the time — and without this
	 * the two would open a listener each on the very same document.
	 *
	 * The key holds the uid, because what a reader may see is the reader's
	 * own; the entry goes once the last of them lets go (and on an error).
	 */
	private followed$(
		trackUid: string,
		uid: string
	): Observable<DocumentData | undefined> {
		const key = `${uid}/${trackUid}`;
		const followed = this.followedLyrics.get(key);

		if (followed) {
			return followed;
		}

		const lyrics$ = docData(
			doc(this.firestore, TRACK_LYRICS_FEATURE_KEY, trackUid)
		).pipe(
			finalize(() => this.followedLyrics.delete(key)),
			shareReplay({ bufferSize: 1, refCount: true })
		);

		this.followedLyrics.set(key, lyrics$);

		return lyrics$;
	}

	public updateTrack(
		trackUid: string,
		changes: TrackLinksUpdate
	): Promise<void> {
		return this.firestoreSync.update(
			doc(this.firestore, TRACK_FEATURE_KEY, trackUid),
			TRACK_FEATURE_KEY,
			changes
		);
	}

	/**
	 * Writes the pictures of a track, in the order they are shown. An empty
	 * list is written as one: the field says there are none, which is what a
	 * reader coming from a bundle with pictures in it has to be told.
	 */
	public updateImages(trackUid: string, images: TrackImage[]): Promise<void> {
		return this.firestoreSync.update(
			doc(this.firestore, TRACK_FEATURE_KEY, trackUid),
			TRACK_FEATURE_KEY,
			{ images }
		);
	}

	/** Empty text removes the lyrics. */
	public saveLyrics(
		trackUid: string,
		{ text, synced }: TrackLyrics
	): Promise<void> {
		const reference = doc(
			this.firestore,
			TRACK_LYRICS_FEATURE_KEY,
			trackUid
		);

		return text.trim()
			? this.firestoreSync.set(reference, TRACK_LYRICS_FEATURE_KEY, {
					text,
					synced: synced?.trim() || null,
				} satisfies TrackLyrics)
			: this.firestoreSync.delete(reference, TRACK_LYRICS_FEATURE_KEY);
	}

	/**
	 * Looks the lyrics up on LRCLIB (lrclib.net): first the exact match,
	 * then the exact match on artist and title alone (the album name or the
	 * length often differ from LRCLIB's), then a looser search. Null when
	 * nothing is found; an error when the search itself fails.
	 */
	public fetchExternalLyrics$(
		query: LyricsQuery
	): Observable<TrackLyrics | null> {
		const byName = new HttpParams()
			.set('artist_name', query.artistName)
			.set('track_name', query.trackName);
		let exact = byName;
		if (query.albumName) {
			exact = exact.set('album_name', query.albumName);
		}
		if (query.durationSec) {
			exact = exact.set('duration', query.durationSec);
		}

		return this.getLyrics$(exact).pipe(
			switchMap((lyrics) =>
				lyrics || exact === byName
					? of(lyrics)
					: this.getLyrics$(byName)
			),
			switchMap((lyrics) =>
				lyrics ? of(lyrics) : this.searchLyrics$(byName)
			)
		);
	}

	/** One exact lookup; null when LRCLIB has no such track (or fails). */
	private getLyrics$(params: HttpParams): Observable<TrackLyrics | null> {
		return this.http
			.get<LrclibRecord>(`${LRCLIB_URL}/get`, { params })
			.pipe(
				retryWhileBusy(),
				map(toLyrics),
				catchError(() => of(null))
			);
	}

	/** The looser search, preferring a match with synced lyrics. */
	private searchLyrics$(params: HttpParams): Observable<TrackLyrics | null> {
		return this.http
			.get<LrclibRecord[]>(`${LRCLIB_URL}/search`, { params })
			.pipe(
				retryWhileBusy(),
				map((records) =>
					toLyrics(
						records.find(
							(record) =>
								!record.instrumental &&
								record.plainLyrics?.trim() &&
								record.syncedLyrics?.trim()
						) ??
							records.find(
								(record) =>
									!record.instrumental &&
									record.plainLyrics?.trim()
							)
					)
				)
			);
	}
}
