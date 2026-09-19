import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, doc } from '@angular/fire/firestore';
import {
	LABEL_FEATURE_KEY,
	LabelDataService,
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate,
	SearchParams,
	withLocalUpdatedAt,
} from '@music-collection/api';

@Injectable()
export class LabelDataServiceImpl extends LabelDataService {
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

	public update$(label: LabelModelUpdate): Observable<LabelModelUpdate> {
		return super.updateModel$(label);
	}
}
