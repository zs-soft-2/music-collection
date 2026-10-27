import { Injectable, inject } from '@angular/core';
import {
	Storage,
	deleteObject,
	getDownloadURL,
	ref,
	uploadBytes,
} from '@angular/fire/storage';

/**
 * The photos of a copy in Storage, under
 * `collection-item/{userId}/{itemId}/{fileName}`.
 *
 * The path carries the owner, which is what both the Storage rule and the
 * Firestore rule check: a document may only point at a file filed under the
 * collector who wrote it.
 */
@Injectable({ providedIn: 'root' })
export class CopyPhotoRepository {
	private readonly storage = inject(Storage);

	public path(userId: string, itemId: string, fileName: string): string {
		return `collection-item/${userId}/${itemId}/${fileName}`;
	}

	/** Uploads the picture. What it can be shown from is `url()`. */
	public async upload(path: string, blob: Blob): Promise<void> {
		await uploadBytes(ref(this.storage, path), blob, {
			contentType: 'image/jpeg',
		});
	}

	/**
	 * The URL a picture can be shown from, asked for when it is shown.
	 *
	 * The answer carries a download token — a key that opens the file to
	 * anyone holding the link, with no login and past the Storage rule — so
	 * it is never written into the copy's document. Asking for it is itself a
	 * rules-checked read, which is why only the owner ever gets one.
	 */
	public url(path: string): Promise<string> {
		return getDownloadURL(ref(this.storage, path));
	}

	/**
	 * Removes a picture. A photo already dropped from the document is worth
	 * nothing, so a failed delete leaves a few kilobytes behind rather than
	 * an error in the collector's way.
	 */
	public async remove(path: string): Promise<void> {
		try {
			await deleteObject(ref(this.storage, path));
		} catch (error) {
			console.error(error);
		}
	}
}
