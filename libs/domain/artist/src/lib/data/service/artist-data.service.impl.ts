import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionData,
	doc,
	Firestore,
	setDoc,
	updateDoc,
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
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class ArtistDataServiceImpl extends ArtistDataService {
	public constructor(firestore: Firestore) {
		super(firestore);

		this.featureKey = ARTIST_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(artist: ArtistModelAdd): Observable<ArtistModel> {
		return super.addModel$(artist);
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

	public importAlbum$(album: AlbumModel): Observable<AlbumModel> {
		return new Observable((subscriber) => {
			const docRef = doc(
				this.firestore,
				ARTIST_FEATURE_KEY,
				album.artist.uid
			);
			const collectionReference = collection(docRef, ALBUM_FEATURE_KEY);

			setDoc(doc(collectionReference, album.uid), album).then(() => {
				subscriber.next({ ...album } as unknown as AlbumModel);
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
		return super.listModels$();
	}

	public listAlbumsById$(uid: string): Observable<AlbumModel[]> {
		const albumCollection = collection(
			this.firestore,
			`${ARTIST_FEATURE_KEY}/${uid}/${ALBUM_FEATURE_KEY}`
		);

		return collectionData(albumCollection, {
			idField: 'uid',
		}) as Observable<AlbumModel[]>;
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
