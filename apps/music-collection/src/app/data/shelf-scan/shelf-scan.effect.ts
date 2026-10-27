import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	IdentifyShelfResponse,
	MAX_SHELF_PHOTOS,
	PhotoMedia,
} from '@music-collection/api';

import { PreparedShelfPhoto, prepareShelfPhoto } from './shelf-photo';
import { ShelfScanRepository } from './shelf-scan.repository';

/**
 * Reading a shelf compartment from photos: scales the pictures and asks the
 * callable for the spines. No barcode step — a spine has no barcode on it —
 * and no pressing lookup either: that comes later, for the submitted rows.
 */
@Injectable({ providedIn: 'root' })
export class ShelfScanEffect {
	private readonly repository = inject(ShelfScanRepository);

	/** The scaled photo and its preview, before anything is sent. */
	public prepare(file: Blob): Promise<PreparedShelfPhoto> {
		return prepareShelfPhoto(file);
	}

	/**
	 * The spines of one compartment. Two photos from different angles are
	 * read separately on the server, and what the two readings disagree on
	 * comes back marked — that is what the collector has to look at.
	 */
	public identify$(
		photos: PreparedShelfPhoto[],
		media: PhotoMedia | null = null
	): Observable<IdentifyShelfResponse> {
		return this.repository.identify$({
			photos: photos
				.slice(0, MAX_SHELF_PHOTOS)
				.map(({ data, mediaType }) => ({ data, mediaType })),
			media,
		});
	}
}
