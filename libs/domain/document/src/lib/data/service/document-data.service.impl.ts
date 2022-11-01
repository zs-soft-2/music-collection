import { from, Observable, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	collection,
	collectionData,
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
import { ref, Storage, uploadBytes } from '@angular/fire/storage';
import { getDownloadURL } from '@firebase/storage';
import {
	DOCUMENT_FEATURE_KEY,
	DocumentDataService,
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate,
	DocumentFile,
} from '@music-collection/api';

@Injectable()
export class DocumentDataServiceImpl extends DocumentDataService {
	protected documentCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore, private storage: Storage) {
		super();

		this.documentCollection = collection(
			this.firestore,
			DOCUMENT_FEATURE_KEY
		);
	}

	public add$(document: DocumentModelAdd): Observable<DocumentModel> {
		const uid = doc(collection(this.firestore, 'id')).id;
		const newDocument: DocumentModel = {
			...document,
			uid,
		};

		return new Observable((subscriber) => {
			setDoc(doc(this.documentCollection, uid), newDocument).then(() => {
				subscriber.next({
					...newDocument,
				} as unknown as DocumentModel);
			});
		});
	}

	public delete$(document: DocumentModel): Observable<DocumentModel> {
		return this.update$(
			document as DocumentModelUpdate
		) as Observable<DocumentModel>;
	}

	public getDownloadURL(path: string): Observable<string> {
		return from(getDownloadURL(ref(this.storage, path)));
	}

	public list$(): Observable<DocumentModel[]> {
		return collectionData(this.documentCollection, {
			idField: 'uid',
		}) as Observable<DocumentModel[]>;
	}

	public load$(uid: string): Observable<DocumentModel | undefined> {
		const documentDocument = doc(
			this.firestore,
			`${DOCUMENT_FEATURE_KEY}/${uid}`
		);

		return docData(documentDocument, {
			idField: 'uid',
		}) as Observable<DocumentModel>;
	}

	public search$(term: string): Observable<DocumentModel[]> {
		const documentQuery = query(
			this.documentCollection,
			where('searchParameters', 'array-contains', term.toLowerCase())
		);

		return new Observable((subscriber) => {
			getDocs(documentQuery)
				.then((snapshot) => {
					subscriber.next(
						snapshot.docs.map(
							(doc) =>
								({
									...doc.data(),
								} as unknown as DocumentModel)
						)
					);
				})
				.catch((error) => {
					subscriber.error(error);
				});
		});
	}

	public update$(
		document: DocumentModelUpdate
	): Observable<DocumentModelUpdate> {
		const documentDocument = doc(
			this.firestore,
			`${DOCUMENT_FEATURE_KEY}/${document.uid}`
		);

		return new Observable((subscriber) => {
			updateDoc(documentDocument, { ...document }).then(() => {
				subscriber.next(document);
			});
		});
	}

	public upload$(file: DocumentFile): Observable<string> {
		const fileReference = ref(this.storage, file.path);

		return from(
			uploadBytes(fileReference, file.content as Blob, {
				customMetadata: file.meta,
			})
		).pipe(
			switchMap((meta) => this.getDownloadURL(meta.metadata.fullPath))
		);
	}
}
