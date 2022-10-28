import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
	DocumentFile,
} from './document';

export abstract class DocumentDataService extends EntityDataService<
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate
> {
	public abstract getDownloadURL(path: string): Observable<string>;
	public abstract search$(query: string): Observable<DocumentEntity[]>;
	public abstract upload$(file: DocumentFile): Observable<string>;
}
