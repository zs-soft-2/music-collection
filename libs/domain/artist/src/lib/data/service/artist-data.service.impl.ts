import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	addDoc,
	collection,
	collectionData,
	CollectionReference,
	doc,
	docData,
	DocumentData,
	Firestore,
	getDocs,
	query,
	updateDoc,
	where,
} from '@angular/fire/firestore';
import {
	ARTIST_FEATURE_KEY,
	ArtistDataService,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
} from '@music-collection/api';

@Injectable()
export class ArtistDataServiceImpl extends ArtistDataService {
	protected artistCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.artistCollection = collection(this.firestore, ARTIST_FEATURE_KEY);
	}

	public add$(artist: ArtistModelAdd): Observable<ArtistModel> {
		return new Observable((subscriber) => {
			addDoc(this.artistCollection, artist).then((data) => {
				subscriber.next(data as unknown as ArtistModel);
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
			where('name', '>=', term)
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
}
