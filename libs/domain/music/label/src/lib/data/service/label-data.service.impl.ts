import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { collection, doc } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	DISCOGS_LABEL_PROFILE_FUNCTION,
	DISCOGS_LABEL_SEARCH_FUNCTION,
	DiscogsLabelProfileRequest,
	DiscogsLabelSearchRequest,
	DiscogsLabelSearchResponse,
	LABEL_FEATURE_KEY,
	LabelDataService,
	LabelExternalCandidate,
	LabelExternalProfile,
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate,
	SearchParams,
	withLocalUpdatedAt,
} from '@music-collection/api';

@Injectable()
export class LabelDataServiceImpl extends LabelDataService {
	private functions = inject(Functions);

	public constructor() {
		super();

		this.featureKey = LABEL_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(label: LabelModelAdd): Observable<LabelModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newLabel: LabelModel = {
			...label,
			uid,
		};

		return new Observable((subscriber) => {
			if (!newLabel.parent) {
				this.firestoreSync
					.set(doc(this.collection, uid), LABEL_FEATURE_KEY, newLabel)
					.then(() => {
						subscriber.next(
							withLocalUpdatedAt(
								newLabel
							) as unknown as LabelModel
						);
					});
			} else {
				const docRef = doc(
					this.firestore,
					LABEL_FEATURE_KEY,
					newLabel.parent.uid
				);
				const collectionReference = collection(
					docRef,
					LABEL_FEATURE_KEY
				);

				this.firestoreSync
					.set(
						doc(collectionReference, uid),
						LABEL_FEATURE_KEY,
						newLabel
					)
					.then(() => {
						subscriber.next(
							withLocalUpdatedAt(
								newLabel
							) as unknown as LabelModel
						);
					});
			}
		});
	}

	public delete$(label: LabelModel): Observable<LabelModel> {
		return this.update$(
			label as LabelModelUpdate
		) as Observable<LabelModel>;
	}

	/** Through the `discogsLabelProfile` callable, which caches it. */
	public fetchExternalProfile$(
		discogsId: number
	): Observable<LabelExternalProfile> {
		const callable = httpsCallable<
			DiscogsLabelProfileRequest,
			LabelExternalProfile
		>(this.functions, DISCOGS_LABEL_PROFILE_FUNCTION);

		return from(callable({ labelId: discogsId })).pipe(
			map((result) => result.data)
		);
	}

	public list$(): Observable<LabelModel[]> {
		return super.listModels$();
	}

	public listByIds$(ids: string[]): Observable<LabelModel[]> {
		return super.listModelsByIds$(ids);
	}

	public load$(uid: string): Observable<LabelModel | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<LabelModel[]> {
		return super.searchModel$(params);
	}

	/** Through the `discogsLabelSearch` callable, which caches the hits. */
	public searchExternalLabels$(
		name: string
	): Observable<LabelExternalCandidate[]> {
		const callable = httpsCallable<
			DiscogsLabelSearchRequest,
			DiscogsLabelSearchResponse
		>(this.functions, DISCOGS_LABEL_SEARCH_FUNCTION);

		return from(callable({ name })).pipe(
			map((result) => result.data.candidates)
		);
	}

	public update$(label: LabelModelUpdate): Observable<LabelModelUpdate> {
		return super.updateModel$(label);
	}
}
