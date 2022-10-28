import { from, Observable, of, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	addDoc,
	collection,
	collectionData,
	CollectionReference,
	doc,
	docData,
	DocumentData,
	Firestore,
	getDocs,
	query,
	updateDoc,
	where,
} from '@angular/fire/firestore';
import { ref, Storage, uploadBytes } from '@angular/fire/storage';
import { getDownloadURL } from '@firebase/storage';
import {
	DOCUMENT_FEATURE_KEY,
	DocumentDataService,
	DocumentEntity,
	DocumentFile,
	DocumentEntityAdd,
	DocumentEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class DocumentDataServiceImpl extends DocumentDataService {
	private documentCollection: CollectionReference<DocumentData>;

	public constructor(private firestore: Firestore, private storage: Storage) {
		super();

		this.documentCollection = collection(
			this.firestore,
			DOCUMENT_FEATURE_KEY
		);
	}

	public add$(document: DocumentEntityAdd): Observable<DocumentEntity> {
		return from(
			addDoc(this.documentCollection, document)
		) as unknown as Observable<DocumentEntity>;
	}

	public delete$(document: DocumentEntity): Observable<DocumentEntity> {
		return this.update$(
			document as DocumentEntityUpdate
		) as Observable<DocumentEntity>;
	}

	public getDownloadURL(path: string): Observable<string> {
		return from(getDownloadURL(ref(this.storage, path)));
	}

	public list$(): Observable<DocumentEntity[]> {
		return collectionData(this.documentCollection, {
			idField: 'uid',
		}) as Observable<DocumentEntity[]>;
	}

	public load$(uid: string): Observable<DocumentEntity | undefined> {
		const documentDocument = doc(
			this.firestore,
			`${DOCUMENT_FEATURE_KEY}/${uid}`
		);

		return docData(documentDocument, {
			idField: 'uid',
		}) as Observable<DocumentEntity>;
	}

	public search$(param: string): Observable<DocumentEntity[]> {
		const documentQuery = query(
			this.documentCollection,
			where('name', '==', param)
		);

		from(getDocs(documentQuery));

		return of([]);
	}

	public update$(
		document: DocumentEntityUpdate
	): Observable<DocumentEntityUpdate> {
		const documentDocument = doc(
			this.firestore,
			`${DOCUMENT_FEATURE_KEY}/${document.uid}`
		);

		return new Observable((next) => {
			updateDoc(documentDocument, { ...document }).then((data) => {
				next.next(document);
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
