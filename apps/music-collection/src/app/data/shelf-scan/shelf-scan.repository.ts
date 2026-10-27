import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	IDENTIFY_SHELF_FUNCTION,
	IdentifyShelfRequest,
	IdentifyShelfResponse,
} from '@music-collection/api';

/** Data access of the shelf scan: the `identifyShelfFromPhotos` callable. */
@Injectable({ providedIn: 'root' })
export class ShelfScanRepository {
	private readonly functions = inject(Functions);

	public identify$(
		request: IdentifyShelfRequest
	): Observable<IdentifyShelfResponse> {
		const callable = httpsCallable<
			IdentifyShelfRequest,
			IdentifyShelfResponse
		>(this.functions, IDENTIFY_SHELF_FUNCTION);

		return from(callable(request)).pipe(map((result) => result.data));
	}
}
