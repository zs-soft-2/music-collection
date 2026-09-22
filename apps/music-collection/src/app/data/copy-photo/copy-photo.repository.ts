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

	/** Uploads the picture and gives back the URL it can be shown from. */
	public async upload(path: string, blob: Blob): Promise<string> {
		const file = ref(this.storage, path);

		await uploadBytes(file, blob, { contentType: 'image/jpeg' });

		return getDownloadURL(file);
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
