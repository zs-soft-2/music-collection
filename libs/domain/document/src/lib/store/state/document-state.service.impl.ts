import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
	DocumentFile,
	DocumentStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as documentActions from './document.actions';
import * as fromDocument from './document.reducer';
import * as documentSelectors from './document.selectors';

@Injectable()
export class DocumentStateServiceImpl extends DocumentStateService {
	public constructor(
		private store: Store<fromDocument.DocumentPartialState>
	) {
		super();
	}

	public dispatchAddEntityAction(document: DocumentEntityAdd): void {
		this.store.dispatch(documentActions.addDocument({ document }));
	}

	public dispatchChangeNewEntityButtonEnabled(enabled: boolean): void {
		this.store.dispatch(
			documentActions.changeNewEntityButtonEnabled({ enabled })
		);
	}

	public dispatchClearFilePathAction(): void {
		this.store.dispatch(documentActions.clearFilePath());
	}

	public dispatchDeleteEntityAction(document: DocumentEntity): void {
		this.store.dispatch(documentActions.deleteDocument({ document }));
	}

	public dispatchListEntitiesAction(): void {
		this.store.dispatch(documentActions.listDocuments());
	}

	public dispatchLoadEntitiesByIdsAction(uids: string[]): void {
		throw new Error('Method not implemented.');
	}

	public dispatchLoadEntityAction(uid: string): void {
		this.store.dispatch(documentActions.loadDocument({ uid }));
	}

	public dispatchSearch(term: string): void {
		this.store.dispatch(documentActions.search({ term }));
	}

	public dispatchSelectDocumentAction(uid: string): void {
		this.store.dispatch(
			documentActions.selectDocument({ documentId: uid })
		);
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.store.dispatch(
			documentActions.setSelectedDocumentId({ documentId: entityId })
		);
	}

	public dispatchUpdateEntityAction(document: DocumentEntityUpdate): void {
		this.store.dispatch(documentActions.updateDocument({ document }));
	}

	public dispatchUploadFileAction(file: DocumentFile): void {
		this.store.dispatch(documentActions.uploadFile({ file }));
	}

	public isLoading$(): Observable<boolean> {
		throw new Error('Method not implemented.');
	}

	public selectEntities$(): Observable<DocumentEntity[]> {
		return this.store.pipe(select(documentSelectors.selectAllDocument));
	}

	public selectEntityById$(
		uid: string
	): Observable<DocumentEntity | undefined> {
		return this.store.pipe(
			select(documentSelectors.selectDocumentById(), { uid })
		);
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return this.store.pipe(
			select(documentSelectors.isNewEntityButtonEnabled)
		);
	}

	public selectSearchResult$(): Observable<DocumentEntity[]> {
		return this.store.pipe(select(documentSelectors.selectSearchResult));
	}

	public selectFilePath$(): Observable<string | undefined> {
		return this.store.pipe(select(documentSelectors.selectFilePath));
	}

	public selectSelectedEntity$(): Observable<DocumentEntity | undefined> {
		return this.store.pipe(select(documentSelectors.selectDocument));
	}

	public selectSelectedEntityID$(): Observable<string> {
		return this.store.pipe(select(documentSelectors.getSelectedId));
	}

	public selectSelectedEntityId$(): Observable<string> {
		throw new Error('Method not implemented.');
	}
}
