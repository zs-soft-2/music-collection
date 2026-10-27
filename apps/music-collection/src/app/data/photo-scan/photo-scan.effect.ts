import { Observable, from, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	IdentifyRecordFromPhotoResponse,
	ScanAlbumContext,
} from '@music-collection/api';

import { detectBarcode } from './barcode-reader';
import { PreparedPhoto, preparePhoto } from './photo-file';
import { PhotoScanRepository } from './photo-scan.repository';

/**
 * Identifying a record from a photo: scales the picture, tries to decode the
 * barcode here — a hit means the server needs no model — and asks the
 * callable for the candidates.
 */
@Injectable({ providedIn: 'root' })
export class PhotoScanEffect {
	private readonly repository = inject(PhotoScanRepository);

	/** The scaled photo and its preview, before anything is sent. */
	public prepare(file: Blob): Promise<PreparedPhoto> {
		return preparePhoto(file);
	}

	/**
	 * The candidates for this photo. With `album` the scan starts from an
	 * album page, where only the pressing is in question — the known album
	 * narrows the search instead of being read off the sleeve.
	 */
	public identify$(
		photo: PreparedPhoto,
		album: ScanAlbumContext | null = null
	): Observable<IdentifyRecordFromPhotoResponse> {
		return from(detectBarcode(photo.blob)).pipe(
			switchMap((barcode) =>
				this.repository.identify$({
					photo: { data: photo.data, mediaType: photo.mediaType },
					barcode,
					album,
				})
			)
		);
	}
}
