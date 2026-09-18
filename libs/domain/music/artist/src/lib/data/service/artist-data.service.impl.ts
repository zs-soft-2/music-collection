import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { collection, doc } from '@angular/fire/firestore';
import {
	ALBUM_FEATURE_KEY,
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate,
	ARTIST_FEATURE_KEY,
	ArtistDataService,
	ArtistExternalAlbum,
	ArtistExternalProfile,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
	RELEASE_FEATURE_KEY,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
	SearchParams,
} from '@music-collection/api';

import {
	MUSICBRAINZ_URL,
	MusicBrainzArtist,
	MusicBrainzReleaseGroupSearch,
	MusicBrainzSearch,
	WIKIDATA_API_URL,
	WIKIPEDIA_SUMMARY_URL,
	WikidataEntities,
	WikipediaSummary,
	pickArtist,
	toCommonsImageUrl,
	toArtistType,
	toCountry,
	toExternalAlbum,
	toFormedIn,
	toStyles,
	toWikidataId,
} from './artist-external.mapper';

@Injectable()
export class ArtistDataServiceImpl extends ArtistDataService {
	private http = inject(HttpClient);

	public constructor() {
		super();

		this.featureKey = ARTIST_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(artist: ArtistModelAdd): Observable<ArtistModel> {
		return super.addModel$(artist);
	}

	/**
	 * Looks the artist up on MusicBrainz by name, and its description on
	 * the English Wikipedia and its photo on Commons through Wikidata. Null when not found.
	 */
	public fetchExternalProfile$(
		name: string
	): Observable<ArtistExternalProfile | null> {
		return this.searchMusicBrainzArtist$(name).pipe(
			switchMap((hit) =>
				hit
					? this.http.get<MusicBrainzArtist>(
							`${MUSICBRAINZ_URL}/artist/${hit.id}`,
							{
								params: new HttpParams()
									.set('inc', 'genres+url-rels')
									.set('fmt', 'json'),
							}
						)
					: of(null)
			),
			switchMap((artist) =>
				artist
					? this.fetchWikidata$(toWikidataId(artist.relations)).pipe(
							map(
								({
									description,
									imageUrl,
								}): ArtistExternalProfile => ({
									artistType: toArtistType(artist.type),
									country: toCountry(artist.country),
									description,
									formedIn: toFormedIn(
										artist['life-span']?.begin
									),
									imageUrl,
									name: artist.name,
									sourceUrl: `https://musicbrainz.org/artist/${artist.id}`,
									styles: toStyles(artist.genres),
								})
							)
						)
					: of(null)
			)
		);
	}

	/**
	 * The official studio albums and EPs of the artist found on MusicBrainz
	 * by name, the oldest first. Empty when the artist is not found. Live
	 * albums and compilations are left out: official bootlegs outnumber the
	 * albums of some bands by far.
	 */
	public fetchExternalAlbums$(
		name: string
	): Observable<ArtistExternalAlbum[]> {
		return this.searchMusicBrainzArtist$(name).pipe(
			switchMap((hit) =>
				hit
					? this.http.get<MusicBrainzReleaseGroupSearch>(
							`${MUSICBRAINZ_URL}/release-group`,
							{
								params: new HttpParams()
									.set(
										'query',
										`arid:${hit.id} AND primarytype:(album OR ep) AND status:official AND NOT secondarytype:*`
									)
									.set('limit', 100)
									.set('fmt', 'json'),
							}
						)
					: of(null)
			),
			map((result) =>
				(result?.['release-groups'] ?? [])
					.map(toExternalAlbum)
					.filter((album): album is ArtistExternalAlbum => !!album)
					.sort(
						(a, b) =>
							(a.year?.getTime() ?? 0) - (b.year?.getTime() ?? 0)
					)
			)
		);
	}

	public addAlbum$(album: AlbumModelAdd): Observable<AlbumModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newAlbum: AlbumModel = {
			...album,
			uid,
		};

		return new Observable((subscriber) => {
			const docRef = doc(
				this.firestore,
				ARTIST_FEATURE_KEY,
				newAlbum.artist.uid
			);
			const collectionReference = collection(docRef, ALBUM_FEATURE_KEY);

			this.firestoreSync
				.set(doc(collectionReference, uid), ALBUM_FEATURE_KEY, newAlbum)
				.then(() => {
					subscriber.next({ ...newAlbum } as unknown as AlbumModel);
				});
		});
	}

	public addRelease$(release: ReleaseModelAdd): Observable<ReleaseModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newRelease: ReleaseModel = {
			...release,
			uid,
		};

		return new Observable((subscriber) => {
			const docRef = doc(
				this.firestore,
				ARTIST_FEATURE_KEY,
				newRelease.album.artist.uid,
				ALBUM_FEATURE_KEY,
				newRelease.album.uid
			);
			const collectionReference = collection(docRef, RELEASE_FEATURE_KEY);

			this.firestoreSync
				.set(
					doc(collectionReference, uid),
					RELEASE_FEATURE_KEY,
					newRelease
				)
				.then(() => {
					subscriber.next({
						...newRelease,
					} as unknown as ReleaseModel);
				});
		});
	}

	public delete$(artist: ArtistModel): Observable<ArtistModel> {
		return this.update$(
			artist as ArtistModelUpdate
		) as Observable<ArtistModel>;
	}

	public deleteRelease$(release: ReleaseModel): Observable<ReleaseModel> {
		return new Observable((subscriber) => {
			const releaseDocument = doc(
				this.firestore,
				`${ARTIST_FEATURE_KEY}/${release.artist.uid}/${ALBUM_FEATURE_KEY}/${release.album.uid}/${RELEASE_FEATURE_KEY}/${release.uid}`
			);

			this.firestoreSync
				.delete(releaseDocument, RELEASE_FEATURE_KEY)
				.then(() => {
					subscriber.next({
						...release,
					} as unknown as ReleaseModel);
				});
		});
	}

	public importAlbum$(album: AlbumModel): Observable<AlbumModel> {
		return new Observable((subscriber) => {
			const docRef = doc(
				this.firestore,
				ARTIST_FEATURE_KEY,
				album.artist.uid
			);
			const collectionReference = collection(docRef, ALBUM_FEATURE_KEY);

			this.firestoreSync
				.set(
					doc(collectionReference, album.uid),
					ALBUM_FEATURE_KEY,
					album
				)
				.then(() => {
					subscriber.next({ ...album } as unknown as AlbumModel);
				});
		});
	}

	public list$(): Observable<ArtistModel[]> {
		return super.listModels$();
	}

	public listAlbumsById$(uid: string): Observable<AlbumModel[]> {
		const albumCollection = collection(
			this.firestore,
			`${ARTIST_FEATURE_KEY}/${uid}/${ALBUM_FEATURE_KEY}`
		);

		return this.firestoreSync.list$<AlbumModel>({
			featureKey: ALBUM_FEATURE_KEY,
			cacheKey: `${ALBUM_FEATURE_KEY}@${albumCollection.path}`,
			query: albumCollection,
		});
	}

	public listByIds$(ids: string[]): Observable<ArtistModel[]> {
		return super.listModelsByIds$(ids);
	}

	public load$(uid: string): Observable<ArtistModel | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<ArtistModel[]> {
		return super.searchModel$(params);
	}

	public update$(artist: ArtistModelUpdate): Observable<ArtistModelUpdate> {
		return super.updateModel$(artist);
	}

	public updateAlbum$(album: AlbumModelUpdate): Observable<AlbumModelUpdate> {
		const albumDocument = doc(
			this.firestore,
			`${ARTIST_FEATURE_KEY}/${album.artist?.uid}/${ALBUM_FEATURE_KEY}/${album.uid}`
		);

		return new Observable((subscriber) => {
			this.firestoreSync
				.update(albumDocument, ALBUM_FEATURE_KEY, { ...album })
				.then(() => {
					subscriber.next(album);
				});
		});
	}

	public updateRelease$(
		release: ReleaseModelUpdate
	): Observable<ReleaseModelUpdate> {
		const releaseDocument = doc(
			this.firestore,
			`${ARTIST_FEATURE_KEY}/${release.album?.artist?.uid}/${ALBUM_FEATURE_KEY}/${release.album?.uid}/${RELEASE_FEATURE_KEY}/${release.uid}`
		);

		return new Observable((subscriber) => {
			this.firestoreSync
				.update(releaseDocument, RELEASE_FEATURE_KEY, { ...release })
				.then(() => {
					subscriber.next(release);
				});
		});
	}

	/** The MusicBrainz artist of the name; null when not found. */
	private searchMusicBrainzArtist$(
		name: string
	): Observable<MusicBrainzArtist | null> {
		const params = new HttpParams()
			.set('query', `artist:"${name.replace(/"/g, '')}"`)
			.set('limit', 10)
			.set('fmt', 'json');

		return this.http
			.get<MusicBrainzSearch>(`${MUSICBRAINZ_URL}/artist`, { params })
			.pipe(map((result) => pickArtist(name, result.artists ?? [])));
	}

	/**
	 * The English Wikipedia summary and the Commons photo of a Wikidata
	 * item; null where missing. Both are optional: errors give nulls.
	 */
	private fetchWikidata$(
		wikidataId: string | null
	): Observable<{ description: string | null; imageUrl: string | null }> {
		const empty = { description: null, imageUrl: null };
		if (!wikidataId) {
			return of(empty);
		}
		const params = new HttpParams()
			.set('action', 'wbgetentities')
			.set('ids', wikidataId)
			.set('props', 'sitelinks|claims')
			.set('sitefilter', 'enwiki')
			.set('format', 'json')
			.set('origin', '*');

		return this.http
			.get<WikidataEntities>(WIKIDATA_API_URL, { params })
			.pipe(
				switchMap((result) => {
					const entity = result.entities?.[wikidataId];
					const imageUrl = toCommonsImageUrl(entity?.claims);
					const title = entity?.sitelinks?.['enwiki']?.title;

					const summary$: Observable<WikipediaSummary | null> = title
						? this.http.get<WikipediaSummary>(
								`${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(
									title.replace(/ /g, '_')
								)}`
							)
						: of(null);

					return summary$.pipe(
						map((summary) => ({
							description:
								summary?.type === 'standard'
									? summary.extract?.trim() || null
									: null,
							imageUrl,
						})),
						catchError(() => of({ description: null, imageUrl }))
					);
				}),
				catchError(() => of(empty))
			);
	}
}
