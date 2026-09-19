import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { collection } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	DISCOGS_ARTIST_PROFILE_FUNCTION,
	DiscogsArtistProfileRequest,
	MUSICIAN_FEATURE_KEY,
	MusicianDataService,
	MusicianExternalProfile,
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class MusicianDataServiceImpl extends MusicianDataService {
	private functions = inject(Functions);

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

	/** Through the `discogsArtistProfile` callable, which caches it. */
	public fetchExternalProfile$(
		discogsId: number
	): Observable<MusicianExternalProfile> {
		const callable = httpsCallable<
			DiscogsArtistProfileRequest,
			MusicianExternalProfile
		>(this.functions, DISCOGS_ARTIST_PROFILE_FUNCTION);

		return from(callable({ artistId: discogsId })).pipe(
			map((result) => result.data)
		);
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
