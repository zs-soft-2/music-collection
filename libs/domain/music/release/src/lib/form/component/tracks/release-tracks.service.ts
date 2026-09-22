import { Observable, combineLatest, map, of, switchMap } from 'rxjs';

import { Injectable, inject, signal } from '@angular/core';
import {
	AlbumStateService,
	ReleaseEntity,
	ReleaseStateService,
	ReleaseTrackDraft,
	TrackEntity,
} from '@music-collection/api';

export interface ReleaseTracksParams {
	release: ReleaseEntity | undefined;
	/** The album's own tracks — every pressing plays these. */
	albumTracks: TrackEntity[];
	/** What this pressing added, in play order. */
	releaseTracks: TrackEntity[];
	/** Where the next added track lands in play order. */
	nextIndex: number;
}

const EMPTY: ReleaseTracksParams = {
	release: undefined,
	albumTracks: [],
	releaseTracks: [],
	nextIndex: 1,
};

/**
 * The tracks one pressing added beyond the album's own.
 *
 * An album is nine songs; a Japanese edition of it is ten. The tenth belongs
 * to that pressing and to nothing else, so it is written with the release
 * named on it — which is what keeps it off every other copy's tracklist, and
 * off the album page, while still making it a track like any other.
 */
@Injectable()
export class ReleaseTracksService {
	private albumStateService = inject(AlbumStateService);
	private releaseStateService = inject(ReleaseStateService);

	private params: ReleaseTracksParams = EMPTY;

	public readonly saving = signal(false);
	public readonly error = signal<string | null>(null);

	public init$(releaseId: string): Observable<ReleaseTracksParams> {
		if (!releaseId) {
			return of(EMPTY);
		}

		return this.releaseStateService.selectEntityById$(releaseId).pipe(
			switchMap((release) => {
				const albumUid = release?.album?.uid;

				if (!albumUid) {
					return of({ ...EMPTY, release });
				}

				return combineLatest([
					this.albumStateService.listTracks$(albumUid),
					this.albumStateService.listReleaseTracks$(releaseId),
				]).pipe(
					map(([tracks, releaseTracks]) => {
						// The album's list is every track carrying the album,
						// this pressing's additions among them. What belongs
						// to a pressing is listed apart.
						const albumTracks = tracks.filter(
							(track) => !track.releaseUid
						);

						this.params = {
							release,
							albumTracks,
							releaseTracks,
							nextIndex: nextIndexOf(albumTracks, releaseTracks),
						};

						return this.params;
					})
				);
			})
		);
	}

	/** Writes a track of this pressing — a new one, or an edited one. */
	public async save(draft: {
		uid: string | null;
		index: number;
		position: string;
		name: string;
		duration: string;
	}): Promise<boolean> {
		const release = this.params.release;
		const albumUid = release?.album?.uid;

		if (!release || !albumUid || !draft.name.trim() || this.saving()) {
			return false;
		}
		this.saving.set(true);
		this.error.set(null);

		const track: ReleaseTrackDraft = {
			uid: draft.uid,
			albumUid,
			releaseUid: release.uid,
			index: draft.index,
			position: draft.position.trim() || String(draft.index),
			name: draft.name.trim(),
			duration: draft.duration.trim() || null,
		};

		try {
			await this.albumStateService.saveReleaseTrack(track);

			return true;
		} catch (error) {
			console.error(error);
			this.error.set('Saving the track failed.');

			return false;
		} finally {
			this.saving.set(false);
		}
	}

	/** Takes a track back off the pressing. */
	public async remove(uid: string): Promise<void> {
		if (this.saving()) {
			return;
		}
		this.saving.set(true);
		this.error.set(null);
		try {
			await this.albumStateService.deleteReleaseTrack(uid);
		} catch (error) {
			console.error(error);
			this.error.set('Removing the track failed.');
		} finally {
			this.saving.set(false);
		}
	}
}

/**
 * Where a newly added track goes in play order: after everything the copy
 * already plays. Counting rather than taking the highest index would put a
 * second bonus track on top of the first on an album whose own list is
 * shorter than its numbering.
 */
function nextIndexOf(
	albumTracks: TrackEntity[],
	releaseTracks: TrackEntity[]
): number {
	const highest = [...albumTracks, ...releaseTracks].reduce(
		(max, track) => Math.max(max, track.index ?? 0),
		0
	);

	return highest + 1;
}
