import { from, Observable } from 'rxjs';

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
	AlbumDataService,
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate,
} from '@music-collection/api';

@Injectable()
export class AlbumDataServiceImpl extends AlbumDataService {
	protected albumCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.albumCollection = collection(this.firestore, ALBUM_FEATURE_KEY);
	}

	public add$(album: AlbumModelAdd): Observable<AlbumModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newAlbum: AlbumModel = {
			...album,
			uid,
		};

		return new Observable((subscriber) => {
			setDoc(doc(this.albumCollection, uid), newAlbum).then(() => {
				subscriber.next({ ...newAlbum } as unknown as AlbumModel);
			});
		});
	}

	public delete$(album: AlbumModel): Observable<AlbumModel> {
		return this.update$(
			album as AlbumModelUpdate
		) as Observable<AlbumModel>;
	}

	public list$(): Observable<AlbumModel[]> {
		return collectionData(this.albumCollection, {
			idField: 'uid',
		}) as Observable<AlbumModel[]>;
	}

	public listByIds$(ids: string[]): Observable<AlbumModel[]> {
		const albumsQuery = query(
			this.albumCollection,
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
		const albumDocument = doc(
			this.firestore,
			`${ALBUM_FEATURE_KEY}/${uid}`
		);

		return docData(albumDocument, {
			idField: 'uid',
		}) as Observable<AlbumModel>;
	}

	public search$(term: string): Observable<AlbumModel[]> {
		const albumQuery = query(
			this.albumCollection,
			where('name', '>=', term)
		);

		return new Observable((subscriber) => {
			getDocs(albumQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as AlbumModel)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
	}

	public update$(album: AlbumModelUpdate): Observable<AlbumModelUpdate> {
		const albumDocument = doc(
			this.firestore,
			`${ALBUM_FEATURE_KEY}/${album.uid}`
		);

		return new Observable((subscriber) => {
			updateDoc(albumDocument, { ...album }).then(() => {
				subscriber.next(album);
			});
		});
	}
}
