import { Injectable, inject } from '@angular/core';
import {
	Storage,
	getDownloadURL,
	ref,
	uploadBytes,
} from '@angular/fire/storage';

/**
 * Files in the `document/` folder — where every picture of the catalog
 * lives: the uploaded covers, the generated badges, and now the pictures of
 * a song.
 *
 * One folder rather than one per feature, because the rule there is already
 * written and deployed, and because a file is found through the document
 * over it rather than through the folder it sits in.
 */
@Injectable({ providedIn: 'root' })
export class DocumentFileRepository {
	private readonly storage = inject(Storage);

	public path(fileName: string): string {
		return `document/${fileName}`;
	}

	/**
	 * Uploads the file and answers with the address it can be shown from.
	 *
	 * The answer carries a download token, which is what makes it loadable
	 * from a plain `<img>` — the same shape of address the covers and the
	 * generated pins are filed with, so the catalog holds one kind of URL.
	 */
	public async upload(path: string, blob: Blob): Promise<string> {
		const stored = ref(this.storage, path);

		await uploadBytes(stored, blob, {
			contentType: blob.type || 'application/octet-stream',
		});

		return getDownloadURL(stored);
	}
}
