import { Observable } from 'rxjs';

import { FirebaseDataService } from '../../core';
import {
	DocumentFile,
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate,
} from './document';

export abstract class DocumentDataService extends FirebaseDataService<
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate
> {
	public abstract getDownloadURL(path: string): Observable<string>;
	/**
	 * Takes a withdrawn document back. Withdrawing is `delete$`, which marks
	 * the document instead of removing it, so both ways write one field.
	 */
	public abstract restore$(
		document: DocumentModel
	): Observable<DocumentModel>;
	public abstract upload$(file: DocumentFile): Observable<string>;
}
