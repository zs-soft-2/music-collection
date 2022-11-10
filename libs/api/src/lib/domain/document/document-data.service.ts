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
	public abstract upload$(file: DocumentFile): Observable<string>;
}
