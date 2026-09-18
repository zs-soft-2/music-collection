import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection } from '@angular/fire/firestore';
import {
	MUSICIAN_FEATURE_KEY,
	MusicianDataService,
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class MusicianDataServiceImpl extends MusicianDataService {
	public constructor() {
		super();

		this.featureKey = MUSICIAN_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(musician: MusicianModelAdd): Observable<MusicianModel> {
		return super.addModel$(musician);
	}

	public delete$(musician: MusicianModel): Observable<MusicianModel> {
		return this.update$(
			musician as MusicianModelUpdate
		) as Observable<MusicianModel>;
	}

	public list$(): Observable<MusicianModel[]> {
		return super.listModels$();
	}

	public listByIds$(ids: string[]): Observable<MusicianModel[]> {
		return super.listModelsByIds$(ids);
	}

	public load$(uid: string): Observable<MusicianModel | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<MusicianModel[]> {
		return super.searchModel$(params);
	}

	public update$(
		musician: MusicianModelUpdate
	): Observable<MusicianModelUpdate> {
		return super.updateModel$(musician);
	}
}
