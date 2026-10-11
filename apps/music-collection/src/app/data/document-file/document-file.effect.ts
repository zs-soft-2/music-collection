import { firstValueFrom } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	type DocumentCategoryEnum,
	DocumentDataService,
	type DocumentEntity,
	DocumentUtilService,
	EntityTypeEnum,
} from '@music-collection/api';

import { DocumentFileRepository } from './document-file.repository';

/**
 * Filing a file in the catalog: the object in Storage, and the document over
 * it that makes it findable.
 *
 * Both steps or neither, and the write is awaited rather than dispatched: a
 * file uploaded without its document is a file nobody will ever see again,
 * which is exactly the failure the document exists to prevent. The caller is
 * told when it is really filed.
 */
@Injectable({ providedIn: 'root' })
export class DocumentFileEffect {
	private readonly files = inject(DocumentFileRepository);
	private readonly documents = inject(DocumentDataService);
	private readonly documentUtil = inject(DocumentUtilService);

	/**
	 * Uploads the blob and files a document over it. `name` is what the file
	 * is for — `foreclosure-of-a-dream-1`, say — and the moment goes into
	 * the file name, so a new upload never lands on the file it follows: a
	 * document pointing at the old one goes on loading.
	 */
	public async store(
		name: string,
		blob: Blob,
		options: {
			category?: DocumentCategoryEnum;
			/** What the file is called on the uploader's disk, where known. */
			originalName?: string;
			extension?: string;
		} = {}
	): Promise<DocumentEntity> {
		const extension =
			options.extension ?? blob.type.split('/').pop() ?? 'bin';
		const path = this.files.path(`${name}-${Date.now()}.${extension}`);
		const filePath = await this.files.upload(path, blob);

		const added = await firstValueFrom(
			this.documents.add$(
				this.documentUtil.convertEntityAddToModelAdd({
					entityType: EntityTypeEnum.Document,
					name,
					originalName: options.originalName ?? name,
					fileType: blob.type,
					filePath,
					...(options.category ? { category: options.category } : {}),
				})
			)
		);

		return added as DocumentEntity;
	}
}
