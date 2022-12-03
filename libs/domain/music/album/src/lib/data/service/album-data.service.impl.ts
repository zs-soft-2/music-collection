import { Observable, of, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionGroup,
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
} from '@music-collection/api';

@Injectable()
export class AlbumDataServiceImpl extends AlbumDataService {
	public constructor(firestore: Firestore) {
		super(firestore);

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

	public update$(album: AlbumModelUpdate): Observable<AlbumModelUpdate> {
		return super.updateModel$(album);
	}
}
