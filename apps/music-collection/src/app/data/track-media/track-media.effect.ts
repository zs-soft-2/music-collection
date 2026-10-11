import { firstValueFrom } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	MAX_TRACK_IMAGE_HINT,
	type TrackClipEstimate,
	type TrackClipState,
	type TrackImage,
	type TrackImageModel,
	type TrackMediaRequest,
} from '@music-collection/api';

import { TrackMediaRepository } from './track-media.repository';

/** How often a clip being made is asked about while a page is watching. */
export const CLIP_POLL_MS = 15_000;

/**
 * Having a song's media made, and finding out where it got to.
 *
 * Nothing is generated here: the gateway runs the model, the function writes
 * the prompt and files the result as a document, and this only asks. The
 * asking is worth a layer of its own because a clip takes minutes — long
 * enough that a page has to be able to leave and come back to the same job.
 */
@Injectable({ providedIn: 'root' })
export class TrackMediaEffect {
	private readonly repository = inject(TrackMediaRepository);

	/** What one clip would cost, and what is left of today's allowance. */
	public estimateClip(trackUid: string): Promise<TrackClipEstimate> {
		return firstValueFrom(this.repository.estimate$(trackUid));
	}

	/**
	 * The models this tenant may draw with. Asked of the gateway, so a
	 * picker never offers a model nobody can call.
	 */
	public imageModels(trackUid: string): Promise<TrackImageModel[]> {
		return firstValueFrom(this.repository.models$(trackUid));
	}

	/**
	 * Draws one picture for the song and files it. The prompt is written on
	 * the server; `hint` is a short line of direction and nothing more, so
	 * it is cut to length before it ever leaves the browser.
	 */
	public async drawImage(
		trackUid: string,
		model: string | null,
		hint: string
	): Promise<TrackImage> {
		const { image } = await firstValueFrom(
			this.repository.drawImage$(
				trackUid,
				model,
				hint.trim().slice(0, MAX_TRACK_IMAGE_HINT)
			)
		);

		return {
			entityType: image.entityType,
			uid: image.uid,
			name: image.name,
			filePath: image.filePath,
			category: image.category,
			width: image.width ?? null,
			height: image.height ?? null,
			generated: true,
		};
	}

	/**
	 * Starts the clip. Resolves as soon as the gateway has accepted the
	 * work — the clip itself arrives minutes later, through `clipState`.
	 */
	public startClip(
		trackUid: string,
		qualityProfile: TrackMediaRequest['qualityProfile'] = 'economy'
	): Promise<TrackClipState> {
		return firstValueFrom(
			this.repository.startClip$(trackUid, qualityProfile)
		);
	}

	/**
	 * Where the clip stands. The same call is what files a finished clip, so
	 * asking is not idle: a job nobody asks about stays unfinished until
	 * somebody does.
	 */
	public clipState(trackUid: string): Promise<TrackClipState> {
		return firstValueFrom(this.repository.clipState$(trackUid));
	}
}
