import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, Firestore } from '@angular/fire/firestore';
import {
	RELEASE_FEATURE_KEY,
	ReleaseDataService,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class ReleaseDataServiceImpl extends ReleaseDataService {
	public constructor(firestore: Firestore) {
		super(firestore);

		this.featureKey = RELEASE_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(release: ReleaseModelAdd): Observable<ReleaseModel> {
		return super.addModel$(release);
	}

	public delete$(release: ReleaseModel): Observable<ReleaseModel> {
		return this.update$(
			release as ReleaseModelUpdate
		) as Observable<ReleaseModel>;
	}

	public list$(): Observable<ReleaseModel[]> {
		return super.listModels$();
	}

	public listByIds$(ids: string[]): Observable<ReleaseModel[]> {
		return super.listModelsByIds$(ids);
	}

	public load$(uid: string): Observable<ReleaseModel | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<ReleaseModel[]> {
		return super.searchModel$(params);
	}

	public update$(
		release: ReleaseModelUpdate
	): Observable<ReleaseModelUpdate> {
		return super.updateModel$(release);
	}
}
