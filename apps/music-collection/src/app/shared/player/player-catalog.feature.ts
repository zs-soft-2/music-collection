import { computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type AlbumEntity, AlbumStateService } from '@music-collection/api';
import { signalStoreFeature, withComputed, withProps } from '@ngrx/signals';

import { ExternalPlayerConsentService } from '../../data/external-player';
import { SpotifyPlaybackStore } from '../spotify/spotify-playback.store';
import { YoutubePlaybackStore } from '../youtube/youtube-playback.store';

import { playableSourcesOf } from './player-sources';

/**
 * The catalog as the player sees it: the albums it knows (`_albums`, for the
 * rest of the player to read and nobody else), and which of them a card can
 * start at all.
 */
export function withPlayerCatalog() {
	return signalStoreFeature(
		withProps((_store, albumStateService = inject(AlbumStateService)) => ({
			_albums: toSignal(albumStateService.selectEntities$(), {
				initialValue: [] as AlbumEntity[],
			}),
		})),
		withComputed(
			(
				store,
				spotify = inject(SpotifyPlaybackStore),
				youtube = inject(YoutubePlaybackStore),
				consent = inject(ExternalPlayerConsentService)
			) => {
				/**
				 * The records a card can start, by the source it would start
				 * them on — none at all while the outside players are not
				 * allowed, so a button that could only disappoint is never
				 * offered.
				 *
				 * A Spotify record counts only with the collector's own app:
				 * Spotify's embedded frame plays on the record's own page, but a
				 * card has no frame whose play button could be pressed. A
				 * YouTube record counts by its playlist or its videos, and only
				 * while YouTube's player can be driven at all.
				 */
				const playableSources = computed(() => {
					const ownApp = spotify.hasOwnApp();
					const canDriveYoutube = youtube.controllable();

					return playableSourcesOf(
						consent.allowed() ? (store._albums() ?? []) : [],
						{ ownApp, canDriveYoutube }
					);
				});

				return {
					/** The outside players may be put on the page at all. */
					playersAllowed: computed(() => consent.allowed()),
					/**
					 * Albums of the catalog this player can start itself, by the
					 * source it would start them on — none at all while the
					 * outside players are not allowed, so a button that could
					 * only disappoint is never offered.
					 *
					 * A Spotify album counts only with the collector's own app:
					 * Spotify's embedded frame plays on the album's own page, but
					 * a card has no frame whose play button could be pressed.
					 */
					playableSources,
					/** Every record a card could start, on whichever source. */
					playableAlbumIds: computed(
						() =>
							new Set([
								...playableSources().spotify,
								...playableSources().youtube,
							])
					),
				};
			}
		)
	);
}
