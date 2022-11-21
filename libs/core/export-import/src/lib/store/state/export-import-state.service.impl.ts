import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	AlbumEntity,
	AlbumEntityUpdate,
	ArtistEntity,
	DocumentEntity,
	DocumentFile,
	ExportImportStateService,
} from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as exportImportActions from './export-import.actions';
import { ExportImportPartialState } from './export-import.reducer';
import * as exportImportSelectors from './export-import.selectors';

@Injectable()
export class ExportImportStateServiceImpl extends ExportImportStateService {
	public constructor(private store: Store<ExportImportPartialState>) {
		super();
	}

	public dispatchListAlbumsByIdAction(uid: string): void {
		this.store.dispatch(exportImportActions.listAlbumsById({ uid }));
	}

	public dispatchLoadDocumentAction(uid: string): void {
		this.store.dispatch(exportImportActions.loadDocument({ uid }));
	}

	public dispatchUpdateArtistAction(artist: ArtistEntity): void {
		this.store.dispatch(exportImportActions.updateArtist({ artist }));
	}

	public dispatchUpdateAlbumAction(album: AlbumEntityUpdate): void {
		this.store.dispatch(exportImportActions.updateAlbum({ album }));
	}

	public dispatchUpdateDocumentAction(document: DocumentEntity): void {
		this.store.dispatch(exportImportActions.updateDocument({ document }));
	}

	public dispatchUploadImportFileAction(file: DocumentFile): void {
		this.store.dispatch(exportImportActions.uploadImportFile({ file }));
	}

	public selectAlbums$(): Observable<AlbumEntity[] | null> {
		return this.store.pipe(select(exportImportSelectors.selectAlbums));
	}

	public selectDocumentById$(
		uid: string
	): Observable<DocumentEntity | undefined> {
		return this.store.pipe(
			select(exportImportSelectors.selectDocumentById(uid))
		);
	}

	public selectImportFilePath$(name: string): Observable<string | undefined> {
		return this.store.pipe(
			select(exportImportSelectors.selectImportFilePath(name))
		);
	}
}
