import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	IDENTIFY_RECORD_FROM_PHOTO_FUNCTION,
	IdentifyRecordFromPhotoRequest,
	IdentifyRecordFromPhotoResponse,
} from '@music-collection/api';

/** Data access of the photo scan: the `identifyRecordFromPhoto` callable. */
@Injectable({ providedIn: 'root' })
export class PhotoScanRepository {
	private readonly functions = inject(Functions);

	public identify$(
		request: IdentifyRecordFromPhotoRequest
	): Observable<IdentifyRecordFromPhotoResponse> {
		const callable = httpsCallable<
			IdentifyRecordFromPhotoRequest,
			IdentifyRecordFromPhotoResponse
		>(this.functions, IDENTIFY_RECORD_FROM_PHOTO_FUNCTION);

		return from(callable(request)).pipe(map((result) => result.data));
	}
}
