import { Observable } from 'rxjs';

import { EntityStateService } from '../../common';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
	DocumentFile,
} from './document';

export abstract class DocumentStateService extends EntityStateService<
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate
> {
	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract dispatchClearFilePathAction(): void;
	public abstract dispatchUploadFileAction(file: DocumentFile): void;
	public abstract dispatchUploadImportFileAction(file: DocumentFile): void;
	public abstract selectFilePath$(): Observable<string | undefined>;
	public abstract selectImportFilePath$(
		name: string
	): Observable<string | undefined>;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
	public abstract selectSearchResult$(): Observable<DocumentEntity[]>;
}
