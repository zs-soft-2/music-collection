import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionData,
	collectionGroup,
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
	LABEL_FEATURE_KEY,
	LabelDataService,
	LabelModel,
	LabelModelAdd,
	LabelModelUpdate,
} from '@music-collection/api';

@Injectable()
export class LabelDataServiceImpl extends LabelDataService {
	protected labelCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.labelCollection = collection(this.firestore, LABEL_FEATURE_KEY);
	}

	public add$(label: LabelModelAdd): Observable<LabelModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newLabel: LabelModel = {
			...label,
			uid,
		};

		return new Observable((subscriber) => {
			if (!newLabel.parent) {
				setDoc(doc(this.labelCollection, uid), newLabel).then(() => {
					subscriber.next({ ...newLabel } as unknown as LabelModel);
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

				setDoc(doc(collectionReference, uid), newLabel).then(() => {
					subscriber.next({ ...newLabel } as unknown as LabelModel);
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
		return collectionData(this.labelCollection, {
			idField: 'uid',
		}) as Observable<LabelModel[]>;
	}

	public listByIds$(ids: string[]): Observable<LabelModel[]> {
		const labelsQuery = query(
			this.labelCollection,
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(labelsQuery).then((snapshot) => {
				subscriber.next(
					snapshot.docChanges() as unknown as LabelModel[]
				);
			});
		});
	}

	public load$(uid: string): Observable<LabelModel | undefined> {
		const labelDocument = doc(
			this.firestore,
			`${LABEL_FEATURE_KEY}/${uid}`
		);

		return docData(labelDocument, {
			idField: 'uid',
		}) as Observable<LabelModel>;
	}

	public search$(term: string): Observable<LabelModel[]> {
		const labelQuery = query(
			collectionGroup(this.firestore, LABEL_FEATURE_KEY),
			where('searchParameters', 'array-contains', term.toLowerCase())
		);

		return new Observable((subscriber) => {
			getDocs(labelQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as LabelModel)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
	}

	public update$(label: LabelModelUpdate): Observable<LabelModelUpdate> {
		const labelDocument = doc(
			this.firestore,
			`${LABEL_FEATURE_KEY}/${label.uid}`
		);

		return new Observable((subscriber) => {
			updateDoc(labelDocument, { ...label }).then(() => {
				subscriber.next(label);
			});
		});
	}
}
