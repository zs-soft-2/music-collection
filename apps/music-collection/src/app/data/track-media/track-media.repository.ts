import { Observable, from, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	TRACK_MEDIA_FUNCTION,
	type TrackClipEstimate,
	type TrackClipState,
	type TrackImageModel,
	type TrackImageResult,
	type TrackMediaRequest,
} from '@music-collection/api';

/**
 * Data access of the song's generated media: the `generateTrackMedia`
 * callable.
 *
 * One callable answers every question — what a clip would cost, which
 * models may draw, draw one, start the clip, where it got to — so there is
 * one method per action here rather than one endpoint per action.
 */
@Injectable({ providedIn: 'root' })
export class TrackMediaRepository {
	private readonly functions = inject(Functions);

	public estimate$(trackUid: string): Observable<TrackClipEstimate> {
		return this.call$<TrackClipEstimate>({
			trackUid,
			action: 'estimate',
			qualityProfile: 'economy',
		});
	}

	/** The models this tenant may draw a picture with. */
	public models$(trackUid: string): Observable<TrackImageModel[]> {
		return this.call$<{ models: TrackImageModel[] }>({
			trackUid,
			action: 'models',
		}).pipe(map((answer) => answer.models ?? []));
	}

	public drawImage$(
		trackUid: string,
		model: string | null,
		hint: string
	): Observable<TrackImageResult> {
		return this.call$<TrackImageResult>({
			trackUid,
			action: 'image',
			...(model ? { model } : {}),
			...(hint ? { hint } : {}),
		});
	}

	public startClip$(
		trackUid: string,
		qualityProfile: TrackMediaRequest['qualityProfile']
	): Observable<TrackClipState> {
		return this.call$<TrackClipState>({
			trackUid,
			action: 'start',
			qualityProfile,
		});
	}

	public clipState$(trackUid: string): Observable<TrackClipState> {
		return this.call$<TrackClipState>({ trackUid, action: 'status' });
	}

	private call$<T>(request: TrackMediaRequest): Observable<T> {
		const callable = httpsCallable<TrackMediaRequest, T>(
			this.functions,
			TRACK_MEDIA_FUNCTION
		);

		return from(callable(request)).pipe(map((result) => result.data));
	}
}
