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
 * How long the browser waits for a picture to be drawn.
 *
 * The callable gives itself 300 s because a scene is written first and only
 * then drawn, while the SDK waits 70 s by default — long enough to give up
 * on a picture that is still being made, after the allowance has already
 * been spent on it. The browser therefore waits as long as the function may
 * run; the other actions are a single read and keep the default.
 */
const DRAW_TIMEOUT_MS = 300_000;

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
		return this.call$<TrackImageResult>(
			{
				trackUid,
				action: 'image',
				...(model ? { model } : {}),
				...(hint ? { hint } : {}),
			},
			DRAW_TIMEOUT_MS
		);
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

	private call$<T>(
		request: TrackMediaRequest,
		timeoutMs?: number
	): Observable<T> {
		const callable = httpsCallable<TrackMediaRequest, T>(
			this.functions,
			TRACK_MEDIA_FUNCTION,
			timeoutMs ? { timeout: timeoutMs } : undefined
		);

		return from(callable(request)).pipe(map((result) => result.data));
	}
}
