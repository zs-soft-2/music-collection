import { from, Observable, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { collection, Firestore } from '@angular/fire/firestore';
import { ref, Storage, uploadBytes } from '@angular/fire/storage';
import { getDownloadURL } from '@firebase/storage';
import {
	DOCUMENT_FEATURE_KEY,
	DocumentDataService,
	DocumentFile,
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class DocumentDataServiceImpl extends DocumentDataService {
	public constructor(firestore: Firestore, private storage: Storage) {
		super(firestore);

		this.featureKey = DOCUMENT_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(document: DocumentModelAdd): Observable<DocumentModel> {
		return super.addModel$(document);
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
		return super.listModels$();
	}

	public load$(uid: string): Observable<DocumentModel | undefined> {
		return super.loadModel$(uid);
	}

	public search$(params: SearchParams): Observable<DocumentModel[]> {
		return super.searchModel$(params);
	}

	public update$(
		document: DocumentModelUpdate
	): Observable<DocumentModelUpdate> {
		return super.updateModel$(document);
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
