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
	ArtistExternalCandidate,
	ArtistExternalProfile,
	ArtistExternalQuery,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
	DiscogsLookupClient,
	MUSICBRAINZ_ARTIST_URL,
	MusicBrainzClient,
	RELEASE_FEATURE_KEY,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
	SearchParams,
	toMusicBrainzId,
	withLocalUpdatedAt,
} from '@music-collection/api';

import {
	MusicBrainzArtist,
	MusicBrainzReleaseGroupSearch,
	MusicBrainzSearch,
	WIKIDATA_API_URL,
	WIKIPEDIA_SUMMARY_URL,
	WikidataEntities,
	WikipediaSummary,
	rankArtists,
	toCommonsImageUrl,
	toArtistType,
	toCountry,
	toExternalAlbum,
	toExternalCandidate,
	toFormedIn,
	toStyles,
	toWikidataId,
} from './artist-external.mapper';
import {
	fillArtistGaps,
	hasArtistGaps,
	toDiscogsAlbum,
	toDiscogsCandidate,
	toDiscogsProfile,
} from './artist-discogs.mapper';

/** Hits of the name to rank by country and styles. */
const SEARCH_LIMIT = 25;

@Injectable()
export class ArtistDataServiceImpl extends ArtistDataService {
	private discogs = inject(DiscogsLookupClient);
	private http = inject(HttpClient);
	private musicBrainz = inject(MusicBrainzClient);

	public constructor() {
		super();

		this.featureKey = ARTIST_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(artist: ArtistModelAdd): Observable<ArtistModel> {
		return super.addModel$(artist);
	}

	/**
	 * Looks the artist up online. MusicBrainz answers first — by name, country
	 * and styles, with its description from the English Wikipedia and its
	 * photo from Commons through Wikidata. Null when neither source has it.
	 *
	 * Discogs is asked where that leaves something open: no artist of the name
	 * at all, or one MusicBrainz knows without a description or a picture. It
	 * knows no country and no founding year, so those stay as MusicBrainz left
	 * them; what MusicBrainz does know is never overwritten.
	 *
	 * An artist already identified on Discogs is not looked for on MusicBrainz:
	 * the id names one artist, and there is nothing to search.
	 */
	public fetchExternalProfile$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalProfile | null> {
		if (!toMusicBrainzId(query.musicBrainzId) && query.discogsArtistId) {
			return this.fetchDiscogsProfile$(query.discogsArtistId);
		}

		return this.fetchMusicBrainzProfile$(query).pipe(
			switchMap((profile) =>
				profile && !hasArtistGaps(profile)
					? of(profile)
					: this.searchDiscogsProfile$(query).pipe(
							map((discogs) =>
								profile && discogs
									? fillArtistGaps(profile, discogs)
									: (profile ?? discogs)
							)
						)
			)
		);
	}

	/** The artist on MusicBrainz, with Wikipedia and Commons; null if none. */
	private fetchMusicBrainzProfile$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalProfile | null> {
		return this.searchMusicBrainzArtist$(query).pipe(
			switchMap((hit) =>
				hit
					? this.musicBrainz.get$<MusicBrainzArtist>(
							`/artist/${hit.id}`,
							new HttpParams()
								.set('inc', 'genres+url-rels')
								.set('fmt', 'json')
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
									discogsArtistId: null,
									fillerSourceUrl: null,
									formedIn: toFormedIn(
										artist['life-span']?.begin
									),
									imageUrl,
									musicBrainzId: artist.id,
									name: artist.name,
									source: 'musicbrainz',
									sourceUrl: `${MUSICBRAINZ_ARTIST_URL}/${artist.id}`,
									styles: toStyles(artist.genres),
								})
							)
						)
					: of(null)
			)
		);
	}

	/**
	 * The albums of the artist found online, the oldest first. Empty when no
	 * source has one.
	 *
	 * MusicBrainz answers first with its official studio albums and EPs; live
	 * albums and compilations are left out, as official bootlegs outnumber the
	 * albums of some bands by far. An empty answer — the artist is unknown
	 * there, or it lists nothing but live records — hands the question to the
	 * Discogs discography.
	 */
	public fetchExternalAlbums$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalAlbum[]> {
		if (!toMusicBrainzId(query.musicBrainzId) && query.discogsArtistId) {
			return this.fetchDiscogsAlbums$(query.discogsArtistId);
		}

		return this.fetchMusicBrainzAlbums$(query).pipe(
			switchMap((albums) =>
				albums.length ? of(albums) : this.searchDiscogsAlbums$(query)
			)
		);
	}

	/** The artist's official studio albums and EPs on MusicBrainz. */
	private fetchMusicBrainzAlbums$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalAlbum[]> {
		return this.searchMusicBrainzArtist$(query).pipe(
			switchMap((hit) =>
				hit
					? this.musicBrainz.get$<MusicBrainzReleaseGroupSearch>(
							'/release-group',
							new HttpParams()
								.set(
									'query',
									`arid:${hit.id} AND primarytype:(album OR ep) AND status:official AND NOT secondarytype:*`
								)
								.set('limit', 100)
								.set('fmt', 'json')
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
					subscriber.next(
						withLocalUpdatedAt(newAlbum) as unknown as AlbumModel
					);
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
					subscriber.next(
						withLocalUpdatedAt(
							newRelease
						) as unknown as ReleaseModel
					);
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
					subscriber.next(
						withLocalUpdatedAt(album) as unknown as AlbumModel
					);
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

	/**
	 * The artists of the searched name, the one best fitting the country and
	 * styles of the form first, so the admin can say which namesake theirs
	 * is. The id in the form is not used: it already names one artist, and
	 * there would be nothing to choose.
	 *
	 * A name MusicBrainz knows nobody of is searched on Discogs instead; those
	 * hits carry no country, year or note, so they are harder to tell apart —
	 * which is why this is the fallback and not the first question.
	 */
	public searchExternalArtists$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalCandidate[]> {
		return this.searchMusicBrainzArtists$(query).pipe(
			map((artists) => artists.map(toExternalCandidate)),
			switchMap((candidates) =>
				candidates.length
					? of(candidates)
					: this.searchDiscogsArtists$(query.name)
			)
		);
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
					subscriber.next(withLocalUpdatedAt(album));
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
					subscriber.next(withLocalUpdatedAt(release));
				});
		});
	}

	/**
	 * The MusicBrainz artist the query fits best; null when not found.
	 * A known id settles it, no search needed. Otherwise only the name is
	 * searched on: the country and the styles are left to `pickArtist`, as
	 * a hit MusicBrainz knows no country or tags for would drop out of a
	 * filtered search altogether. Hence the wide page of hits.
	 */
	private searchMusicBrainzArtist$(
		query: ArtistExternalQuery
	): Observable<MusicBrainzArtist | null> {
		const musicBrainzId = toMusicBrainzId(query.musicBrainzId);
		if (musicBrainzId) {
			return of({ id: musicBrainzId, name: query.name });
		}

		return this.searchMusicBrainzArtists$(query).pipe(
			map((artists) => artists[0] ?? null)
		);
	}

	/** The hits of the name, the one the query fits best first. */
	private searchMusicBrainzArtists$(
		query: ArtistExternalQuery
	): Observable<MusicBrainzArtist[]> {
		const params = new HttpParams()
			.set('query', `artist:"${query.name.replace(/"/g, '')}"`)
			.set('limit', SEARCH_LIMIT)
			.set('fmt', 'json');

		return this.musicBrainz
			.get$<MusicBrainzSearch>('/artist', params)
			.pipe(map((result) => rankArtists(query, result.artists ?? [])));
	}

	/**
	 * The Discogs artists of the name, as the chooser lists them. The callable
	 * hands back exact name matches only, so every hit here carries the name —
	 * which of them is the right artist, only the thumbnail and the Discogs
	 * page can say.
	 */
	private searchDiscogsArtists$(
		name: string
	): Observable<ArtistExternalCandidate[]> {
		return this.discogs
			.lookupOrNull$({ kind: 'artist-search', name })
			.pipe(
				map((result) =>
					(result?.candidates ?? []).map(toDiscogsCandidate)
				)
			);
	}

	/** The Discogs artist by its id there; null when the lookup finds none. */
	private fetchDiscogsProfile$(
		discogsArtistId: number
	): Observable<ArtistExternalProfile | null> {
		return this.discogs
			.lookupOrNull$({
				kind: 'artist-profile',
				discogsId: discogsArtistId,
			})
			.pipe(
				map((result) =>
					result ? toDiscogsProfile(result.profile) : null
				)
			);
	}

	/**
	 * The profile of the first Discogs artist of the name. Where several carry
	 * it, the chooser has already asked which one is meant — this runs when the
	 * search found a single artist, or none.
	 */
	private searchDiscogsProfile$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalProfile | null> {
		return this.searchDiscogsArtists$(query.name).pipe(
			switchMap((candidates) => {
				const discogsArtistId = candidates[0]?.discogsArtistId;

				return discogsArtistId
					? this.fetchDiscogsProfile$(discogsArtistId)
					: of(null);
			})
		);
	}

	/** The Discogs discography of the artist by its id there. */
	private fetchDiscogsAlbums$(
		discogsArtistId: number
	): Observable<ArtistExternalAlbum[]> {
		return this.discogs
			.lookupOrNull$({
				kind: 'artist-albums',
				discogsId: discogsArtistId,
			})
			.pipe(
				map((result) =>
					(result?.albums ?? [])
						.map(toDiscogsAlbum)
						.filter(
							(album): album is ArtistExternalAlbum => !!album
						)
				)
			);
	}

	/** The discography of the first Discogs artist of the name. */
	private searchDiscogsAlbums$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalAlbum[]> {
		return this.searchDiscogsArtists$(query.name).pipe(
			switchMap((candidates) => {
				const discogsArtistId = candidates[0]?.discogsArtistId;

				return discogsArtistId
					? this.fetchDiscogsAlbums$(discogsArtistId)
					: of([]);
			})
		);
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
