import { DestroyRef, computed, effect, inject } from '@angular/core';
import type { AlbumEntity, TrackEntity } from '@music-collection/api';
import {
	signalStoreFeature,
	type,
	withComputed,
	withHooks,
	withMethods,
} from '@ngrx/signals';

import {
	PlayRequest,
	PlayerStore,
	albumPlayRequest,
} from '../../../shared/player';
import { albumOf } from './album-page.helpers';

/**
 * The album page's side of the app's one player: it tells the player which
 * record is shown, marks the track playing now, and hands the play over.
 * The page starts nothing itself (see `mc-page-play-button`).
 */
export function withAlbumPlayer() {
	return signalStoreFeature(
		{
			state: type<{
				albumId: string | null;
				albums: AlbumEntity[];
				tracks: TrackEntity[];
			}>(),
		},
		withComputed((store, player = inject(PlayerStore)) => ({
			/** Our id of the album's track playing now. */
			playingTrackId: computed(() => {
				const now = player.now();
				return now?.albumId === store.albumId() ? now.trackId : null;
			}),
			/** The page has a player to show at all. */
			playable: computed(() => player.pagePlayable()),
		})),
		withMethods((store, player = inject(PlayerStore)) => ({
			playTrack(trackId: string): Promise<void> {
				return player.playPageTrack(trackId);
			},
			openPlayer(): void {
				player.openStage();
			},
		})),
		withHooks({
			onInit(store, player = inject(PlayerStore)) {
				// The player gets ready for the album shown.
				let page: PlayRequest | null = null;
				effect(() => {
					const album = albumOf(store.albums(), store.albumId());
					page = album
						? albumPlayRequest(album, store.tracks())
						: null;
					player.setPage(page);
				});
				inject(DestroyRef).onDestroy(() => player.clearPage(page));
			},
		})
	);
}
