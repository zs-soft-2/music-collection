import { from, map, Observable, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { collection, doc } from '@angular/fire/firestore';
import { ref, Storage, uploadBytes } from '@angular/fire/storage';
import { getDownloadURL } from 'firebase/storage';
import {
	DOCUMENT_FEATURE_KEY,
	DocumentDataService,
	DocumentFile,
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate,
	SearchParams,
	withLocalUpdatedAt,
} from '@music-collection/api';

@Injectable()
export class DocumentDataServiceImpl extends DocumentDataService {
	private storage = inject(Storage);

	public constructor() {
		super();

		this.featureKey = DOCUMENT_FEATURE_KEY;
		this.collection = collection(this.firestore, this.featureKey);
	}

	public add$(document: DocumentModelAdd): Observable<DocumentModel> {
		return super.addModel$(document);
	}

	/**
	 * Withdraws the document: it is marked, not removed. The file stays in
	 * Storage and the document stays in Firestore, so an album cover or a
	 * badge chosen while it was live goes on loading; what changes is that
	 * nothing offers it to be chosen again.
	 */
	public delete$(document: DocumentModel): Observable<DocumentModel> {
		return this.mark$(document, Date.now());
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

	/** Takes a withdrawn document back among the ones on offer. */
	public restore$(document: DocumentModel): Observable<DocumentModel> {
		return this.mark$(document, null);
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

	/**
	 * Writes the withdrawal mark alone. A whole-document write would drop
	 * what this client does not carry — the `createdAt` a generated badge was
	 * filed with, say — so this is an update of the single field.
	 */
	private mark$(
		document: DocumentModel,
		deletedAt: number | null
	): Observable<DocumentModel> {
		return from(
			this.firestoreSync.update(
				doc(this.collection, document.uid),
				this.featureKey,
				{ deletedAt }
			)
		).pipe(map(() => withLocalUpdatedAt({ ...document, deletedAt })));
	}
}
