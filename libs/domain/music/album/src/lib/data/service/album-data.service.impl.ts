import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
	collection,
	collectionGroup,
	doc,
	Firestore,
	getDocs,
	query,
	where,
} from '@angular/fire/firestore';
import {
	ALBUM_FEATURE_KEY,
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate,
	SearchParams,
	AlbumDataService,
	AlbumExternalProfile,
	AlbumExternalTrack,
	AlbumExternalTracks,
	MusicBrainzClient,
	TRACK_FEATURE_KEY,
	TrackEntity,
} from '@music-collection/api';

import {
	COVER_ART_ARCHIVE_URL,
	CoverArtArchive,
	MusicBrainzRelease,
	MusicBrainzReleaseGroup,
	MusicBrainzReleaseGroupSearch,
	pickRelease,
	pickReleaseGroup,
	toCoverUrl,
	toDate,
	toFormat,
	toTracks,
	toStyles,
} from './album-external.mapper';

@Injectable()
export class AlbumDataServiceImpl extends AlbumDataService {
	private http = inject(HttpClient);
	private musicBrainz = inject(MusicBrainzClient);

	public constructor() {
		super();

		this.featureKey = ALBUM_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(album: AlbumModelAdd): Observable<AlbumModel> {
		return super.addModel$(album);
	}

	public delete$(album: AlbumModel): Observable<AlbumModel> {
		return this.update$(
			album as AlbumModelUpdate
		) as Observable<AlbumModel>;
	}

	/**
	 * Looks the album of the artist up on MusicBrainz by title, with its
	 * front cover on the Cover Art Archive. Null when not found.
	 */
	public fetchExternalProfile$(
		artistName: string,
		name: string
	): Observable<AlbumExternalProfile | null> {
		return this.findReleaseGroup$(artistName, name, 'genres').pipe(
			switchMap((group) =>
				group
					? this.fetchCoverUrl$(group.id).pipe(
							map((coverImageUrl): AlbumExternalProfile => ({
								coverImageUrl,
								format: toFormat(group),
								name: group.title,
								sourceUrl: `https://musicbrainz.org/release-group/${group.id}`,
								styles: toStyles(group.genres),
								year: toDate(group['first-release-date']),
							}))
						)
					: of(null)
			)
		);
	}

	/**
	 * The tracklist of the album's earliest official release on
	 * MusicBrainz. Null when the album is not found.
	 */
	public fetchExternalTracks$(
		artistName: string,
		name: string
	): Observable<AlbumExternalTracks | null> {
		return this.findReleaseGroup$(artistName, name, 'releases').pipe(
			map((group) => pickRelease(group?.releases)),
			switchMap((release) =>
				release
					? this.musicBrainz.get$<MusicBrainzRelease>(
							`/release/${release.id}`,
							new HttpParams()
								.set('inc', 'recordings')
								.set('fmt', 'json')
						)
					: of(null)
			),
			map((release) =>
				release
					? {
							tracks: toTracks(release),
							sourceUrl: `https://musicbrainz.org/release/${release.id}`,
						}
					: null
			)
		);
	}

	public listTracks$(albumUid: string): Observable<TrackEntity[]> {
		return this.firestoreSync
			.list$<TrackEntity>({
				featureKey: TRACK_FEATURE_KEY,
				cacheKey: `${TRACK_FEATURE_KEY}?albumUid=${albumUid}`,
				query: query(
					collection(this.firestore, TRACK_FEATURE_KEY),
					where('albumUid', '==', albumUid)
				),
			})
			.pipe(
				map((tracks) => [...tracks].sort((a, b) => a.index - b.index))
			);
	}

	/** Same ids as the Discogs import: `<albumUid>_<index:000>`. */
	public saveTracks(
		albumUid: string,
		tracks: AlbumExternalTrack[],
		existing: TrackEntity[]
	): Promise<void> {
		const writes = tracks.map((track, i) => {
			const index = i + 1;
			const uid =
				existing[i]?.uid ??
				`${albumUid}_${String(index).padStart(3, '0')}`;

			return {
				reference: doc(this.firestore, TRACK_FEATURE_KEY, uid),
				data: {
					...track,
					albumUid,
					entityType: 'Track',
					heading: null,
					index,
					source: 'musicbrainz',
					uid,
				},
			};
		});
		const deletions = existing
			.slice(tracks.length)
			.map((track) => doc(this.firestore, TRACK_FEATURE_KEY, track.uid));

		return this.firestoreSync.setAll(TRACK_FEATURE_KEY, writes, deletions);
	}

	public list$(): Observable<AlbumModel[]> {
		return super.listModels$();
	}

	public listByIds$(ids: string[]): Observable<AlbumModel[]> {
		const albumsQuery = query(
			collectionGroup(this.firestore, ALBUM_FEATURE_KEY),
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(albumsQuery).then((snapshot) => {
				subscriber.next(
					snapshot.docChanges() as unknown as AlbumModel[]
				);
			});
		});
	}

	public load$(uid: string): Observable<AlbumModel | undefined> {
		return super
			.listModelsByIds$([uid])
			.pipe(switchMap((entities) => of(entities[0])));
	}

	public search$(params: SearchParams): Observable<AlbumModel[]> {
		return super.searchModel$(params);
	}

	/** The front cover of the release group; null when it has none. */
	private fetchCoverUrl$(releaseGroupId: string): Observable<string | null> {
		return this.http
			.get<CoverArtArchive>(
				`${COVER_ART_ARCHIVE_URL}/release-group/${releaseGroupId}`
			)
			.pipe(
				map(toCoverUrl),
				catchError(() => of(null))
			);
	}

	/**
	 * The release group of the artist with the title, looked up with the
	 * given `inc`; null when not found.
	 */
	private findReleaseGroup$(
		artistName: string,
		name: string,
		inc: string
	): Observable<MusicBrainzReleaseGroup | null> {
		const quote = (value: string): string => value.replace(/"/g, '');
		const params = new HttpParams()
			.set(
				'query',
				`releasegroup:"${quote(name)}" AND artist:"${quote(artistName)}"`
			)
			.set('limit', 25)
			.set('fmt', 'json');

		return this.musicBrainz
			.get$<MusicBrainzReleaseGroupSearch>('/release-group', params)
			.pipe(
				map((result) =>
					pickReleaseGroup(
						artistName,
						name,
						result['release-groups'] ?? []
					)
				),
				switchMap((hit) =>
					hit
						? this.musicBrainz.get$<MusicBrainzReleaseGroup>(
								`/release-group/${hit.id}`,
								new HttpParams()
									.set('inc', inc)
									.set('fmt', 'json')
							)
						: of(null)
				)
			);
	}

	public update$(album: AlbumModelUpdate): Observable<AlbumModelUpdate> {
		return super.updateModel$(album);
	}
}
