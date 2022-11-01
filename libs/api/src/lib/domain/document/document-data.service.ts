import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
	DocumentFile,
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate,
} from './document';

export abstract class DocumentDataService extends EntityDataService<
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate
> {
	public abstract getDownloadURL(path: string): Observable<string>;
	public abstract search$(query: string): Observable<DocumentModel[]>;
	public abstract upload$(file: DocumentFile): Observable<string>;
}
