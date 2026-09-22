import { Injectable, inject } from '@angular/core';
import { CollectionItemPhoto } from '@music-collection/api';

import { scaleImage } from '../../shared/image';
import { CopyPhotoRepository } from './copy-photo.repository';

/**
 * Long edge of a stored copy photo. Larger than the scan's, because this one
 * is looked at rather than read by a machine: it should hold up when the
 * card is turned over on a wide screen.
 */
const MAX_EDGE = 2000;
const QUALITY = 0.82;

/** What a browser hands back from a file picker that we will try to read. */
const ACCEPTED = /^image\//;

/**
 * Preparing and storing the photos of one copy: the picture is scaled in the
 * browser before it is ever uploaded, so nothing leaves the device at phone
 * camera size.
 */
@Injectable({ providedIn: 'root' })
export class CopyPhotoEffect {
	private readonly repository = inject(CopyPhotoRepository);

	/**
	 * Scales the chosen file and uploads it. `slot` is the place the picture
	 * takes on the page — the front is what the card shows, the back is what
	 * it turns to — and it names the file, so replacing one leaves nothing
	 * orphaned beyond the moment.
	 */
	public async store(
		userId: string,
		itemId: string,
		slot: 'front' | 'back',
		file: File
	): Promise<CollectionItemPhoto> {
		if (!ACCEPTED.test(file.type) && file.type !== '') {
			throw new Error('Ez a fájl nem kép.');
		}

		const { blob, width, height } = await scaleImage(file, {
			maxEdge: MAX_EDGE,
			quality: QUALITY,
		});
		// The timestamp keeps a replacement from being served from the cache
		// under the name of the picture it replaced.
		const path = this.repository.path(
			userId,
			itemId,
			`${slot}-${Date.now()}.jpg`
		);
		const url = await this.repository.upload(path, blob);

		return { path, url, width, height };
	}

	/** Drops pictures the copy no longer points at. */
	public async discard(photos: CollectionItemPhoto[]): Promise<void> {
		await Promise.all(
			photos.map((photo) => this.repository.remove(photo.path))
		);
	}
}
