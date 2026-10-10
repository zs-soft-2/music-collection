import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { collection } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	DISCOGS_MASTER_VERSIONS_FUNCTION,
	DiscogsLookupClient,
	DiscogsMasterVersionsRequest,
	DiscogsMasterVersionsResponse,
	DiscogsVersion,
	RELEASE_FEATURE_KEY,
	ReleaseDataService,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
	SearchParams,
} from '@music-collection/api';

import { pickMasterId } from './release-discogs.mapper';

@Injectable()
export class ReleaseDataServiceImpl extends ReleaseDataService {
	private discogs = inject(DiscogsLookupClient);
	private functions = inject(Functions);

	public constructor() {
		super();

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

	/**
	 * The album's Discogs master, through the title search. A miss is an
	 * answer here, not a failure: plenty of the catalog's albums are not on
	 * Discogs at all, and the form says so rather than reporting an error.
	 */
	public findExternalMaster$(
		artistName: string,
		albumName: string
	): Observable<number | null> {
		return this.discogs
			.lookupOrNull$({
				kind: 'master-search',
				artist: artistName,
				album: albumName,
			})
			.pipe(
				map((result) =>
					pickMasterId(artistName, albumName, result?.candidates)
				)
			);
	}

	public list$(): Observable<ReleaseModel[]> {
		return super.listModels$();
	}

	public listByIds$(ids: string[]): Observable<ReleaseModel[]> {
		return super.listModelsByIds$(ids);
	}

	/**
	 * Through the `discogsMasterVersions` callable, which holds the answer
	 * for a week — the same list the collector's release picker reads, so an
	 * album looked at from both sides costs Discogs one call.
	 */
	public listExternalVersions$(
		masterId: number
	): Observable<DiscogsVersion[]> {
		const callable = httpsCallable<
			DiscogsMasterVersionsRequest,
			DiscogsMasterVersionsResponse
		>(this.functions, DISCOGS_MASTER_VERSIONS_FUNCTION);

		return from(callable({ masterId })).pipe(
			map((result) => result.data.versions)
		);
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
