import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionData,
	CollectionReference,
	doc,
	docData,
	DocumentData,
	Firestore,
	getDocs,
	query,
	setDoc,
	updateDoc,
	where,
} from '@angular/fire/firestore';
import {
	ALBUM_FEATURE_KEY,
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate,
	ARTIST_FEATURE_KEY,
	ArtistDataService,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
	RELEASE_FEATURE_KEY,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
} from '@music-collection/api';

@Injectable()
export class ArtistDataServiceImpl extends ArtistDataService {
	protected artistCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.artistCollection = collection(this.firestore, ARTIST_FEATURE_KEY);
	}

	public add$(artist: ArtistModelAdd): Observable<ArtistModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newArtist: ArtistModel = {
			...artist,
			uid,
		};

		return new Observable((subscriber) => {
			setDoc(doc(this.artistCollection, uid), newArtist).then(() => {
				subscriber.next({ ...newArtist } as unknown as ArtistModel);
			});
		});
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

			setDoc(doc(collectionReference, uid), newAlbum).then(() => {
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

			setDoc(doc(collectionReference, uid), newRelease).then(() => {
				subscriber.next({ ...newRelease } as unknown as ReleaseModel);
			});
		});
	}

	public delete$(artist: ArtistModel): Observable<ArtistModel> {
		return this.update$(
			artist as ArtistModelUpdate
		) as Observable<ArtistModel>;
	}

	public list$(): Observable<ArtistModel[]> {
		return collectionData(this.artistCollection, {
			idField: 'uid',
		}) as Observable<ArtistModel[]>;
	}

	public listByIds$(ids: string[]): Observable<ArtistModel[]> {
		const artistsQuery = query(
			this.artistCollection,
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(artistsQuery).then((snapshot) => {
				subscriber.next(
					snapshot.docChanges() as unknown as ArtistModel[]
				);
			});
		});
	}

	public load$(uid: string): Observable<ArtistModel | undefined> {
		const artistDocument = doc(
			this.firestore,
			`${ARTIST_FEATURE_KEY}/${uid}`
		);

		return docData(artistDocument, {
			idField: 'uid',
		}) as Observable<ArtistModel>;
	}

	public search$(term: string): Observable<ArtistModel[]> {
		const artistQuery = query(
			this.artistCollection,
			where('searchParameters', 'array-contains', term.toLowerCase())
		);

		return new Observable((subscriber) => {
			getDocs(artistQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as ArtistModel)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
	}

	public update$(artist: ArtistModelUpdate): Observable<ArtistModelUpdate> {
		const artistDocument = doc(
			this.firestore,
			`${ARTIST_FEATURE_KEY}/${artist.uid}`
		);

		return new Observable((subscriber) => {
			updateDoc(artistDocument, { ...artist }).then(() => {
				subscriber.next(artist);
			});
		});
	}

	public updateAlbum$(album: AlbumModelUpdate): Observable<AlbumModelUpdate> {
		const albumDocument = doc(
			this.firestore,
			`${ARTIST_FEATURE_KEY}/${album.artist?.uid}/${ALBUM_FEATURE_KEY}/${album.uid}`
		);

		return new Observable((subscriber) => {
			updateDoc(albumDocument, { ...album }).then(() => {
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
			updateDoc(releaseDocument, { ...release }).then(() => {
				subscriber.next(release);
			});
		});
	}
}
