import { Injectable, inject } from '@angular/core';
import {
	Storage,
	getDownloadURL,
	ref,
	uploadBytes,
} from '@angular/fire/storage';

/**
 * The pictures an admin uploads for a collection — its cover and its
 * hand-made badge — in Storage, under `document/{fileName}`: the folder the
 * generated pins and the uploaded covers already share.
 *
 * The rule there asks for `createDocumentEntity` and an image under 5 MB,
 * which is what an admin editing a collection carries anyway.
 */
@Injectable({ providedIn: 'root' })
export class CollectionImageRepository {
	private readonly storage = inject(Storage);

	public path(fileName: string): string {
		return `document/${fileName}`;
	}

	/**
	 * Uploads the picture and answers with the URL it can be shown from.
	 *
	 * The answer carries a download token, which is what makes it loadable
	 * from a plain `<img>` — the same shape of URL the generated pins are
	 * filed with, so the definition goes on holding one kind of address.
	 */
	public async upload(path: string, file: File): Promise<string> {
		const stored = ref(this.storage, path);

		await uploadBytes(stored, file, { contentType: file.type });

		return getDownloadURL(stored);
	}
}
