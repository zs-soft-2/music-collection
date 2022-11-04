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
	RELEASE_FEATURE_KEY,
	ReleaseDataService,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
} from '@music-collection/api';

@Injectable()
export class ReleaseDataServiceImpl extends ReleaseDataService {
	protected releaseCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore) {
		super();

		this.releaseCollection = collection(
			this.firestore,
			RELEASE_FEATURE_KEY
		);
	}

	public add$(release: ReleaseModelAdd): Observable<ReleaseModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newRelease: ReleaseModel = {
			...release,
			uid,
		};

		return new Observable((subscriber) => {
			setDoc(doc(this.releaseCollection, uid), newRelease).then(() => {
				subscriber.next({ ...newRelease } as unknown as ReleaseModel);
			});
		});
	}

	public delete$(release: ReleaseModel): Observable<ReleaseModel> {
		return this.update$(
			release as ReleaseModelUpdate
		) as Observable<ReleaseModel>;
	}

	public list$(): Observable<ReleaseModel[]> {
		return collectionData(
			collectionGroup(this.firestore, RELEASE_FEATURE_KEY),
			{
				idField: 'uid',
			}
		) as Observable<ReleaseModel[]>;
	}

	public listByIds$(ids: string[]): Observable<ReleaseModel[]> {
		const releasesQuery = query(
			collectionGroup(this.firestore, RELEASE_FEATURE_KEY),
			where('uid', 'in', ids)
		);

		return new Observable((subscriber) => {
			getDocs(releasesQuery).then((snapshot) => {
				subscriber.next(
					snapshot.docChanges() as unknown as ReleaseModel[]
				);
			});
		});
	}

	public load$(uid: string): Observable<ReleaseModel | undefined> {
		const releaseDocument = doc(
			this.firestore,
			`${RELEASE_FEATURE_KEY}/${uid}`
		);

		return docData(releaseDocument, {
			idField: 'uid',
		}) as Observable<ReleaseModel>;
	}

	public search$(term: string): Observable<ReleaseModel[]> {
		const releaseQuery = query(
			collectionGroup(this.firestore, RELEASE_FEATURE_KEY),
			where('searchParameters', 'array-contains', term.toLowerCase())
		);

		return new Observable((subscriber) => {
			getDocs(releaseQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as ReleaseModel)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
	}

	public update$(
		release: ReleaseModelUpdate
	): Observable<ReleaseModelUpdate> {
		const releaseDocument = doc(
			this.firestore,
			`${RELEASE_FEATURE_KEY}/${release.uid}`
		);

		return new Observable((subscriber) => {
			updateDoc(releaseDocument, { ...release }).then(() => {
				subscriber.next(release);
			});
		});
	}
}
