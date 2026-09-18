import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import {
	FirestoreSyncService,
	TRACK_FEATURE_KEY,
	TRACK_LYRICS_FEATURE_KEY,
	Track,
	TrackLyrics,
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
	private readonly auth = inject(Auth);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly http = inject(HttpClient);

	/** Null when signed out, missing or not readable. */
	public lyrics$(trackUid: string): Observable<TrackLyrics | null> {
		return authState(this.auth).pipe(
			switchMap((user) =>
				user
					? docData(
							doc(
								this.firestore,
								TRACK_LYRICS_FEATURE_KEY,
								trackUid
							)
						).pipe(
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
	 * then a looser search. Null when nothing is found.
	 */
	public fetchExternalLyrics$(
		query: LyricsQuery
	): Observable<TrackLyrics | null> {
		let exact = new HttpParams()
			.set('artist_name', query.artistName)
			.set('track_name', query.trackName);
		if (query.albumName) {
			exact = exact.set('album_name', query.albumName);
		}
		if (query.durationSec) {
			exact = exact.set('duration', query.durationSec);
		}
		const search = new HttpParams()
			.set('artist_name', query.artistName)
			.set('track_name', query.trackName);

		return this.http
			.get<LrclibRecord>(`${LRCLIB_URL}/get`, { params: exact })
			.pipe(
				map(toLyrics),
				catchError(() => of(null)),
				switchMap((lyrics) =>
					lyrics
						? of(lyrics)
						: this.http
								.get<LrclibRecord[]>(`${LRCLIB_URL}/search`, {
									params: search,
								})
								.pipe(
									map((records) =>
										toLyrics(
											// Prefer a match with synced lyrics.
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
								)
				)
			);
	}
}
