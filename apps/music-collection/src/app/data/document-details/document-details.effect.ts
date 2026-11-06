import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { DocumentEntity } from '@music-collection/api';

import { DocumentFileRepository } from '../document-file/document-file.repository';
import { DocumentRepository } from './document.repository';

/**
 * Loads the record of one uploaded file. A document is only ever itself —
 * nothing hangs off it — so this is the one read, kept here so the page
 * reaches Firestore the same way every other page does.
 */
@Injectable({ providedIn: 'root' })
export class DocumentDetailsEffect {
	private readonly repository = inject(DocumentRepository);
	private readonly files = inject(DocumentFileRepository);

	public load$(documentUid: string): Observable<DocumentEntity | null> {
		return this.repository.get$(documentUid);
	}

	/**
	 * The bucket the catalog's own files are kept in — what the page checks
	 * a file's address against before it frames it.
	 */
	public storageBucket(): string {
		return this.files.bucket();
	}
}
