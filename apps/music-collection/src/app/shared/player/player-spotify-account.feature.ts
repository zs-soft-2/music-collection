import { computed, inject } from '@angular/core';
import { signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import { SpotifyPlaybackStore } from '../spotify/spotify-playback.store';

/**
 * The collector's Spotify account as the player's settings show it: their
 * own app, the sign-in, the devices and the browser player's volume. All of
 * it is Spotify's own state, passed on so that the pages only ever talk to
 * the one player.
 */
export function withPlayerSpotifyAccount() {
	return signalStoreFeature(
		withComputed((_store, spotify = inject(SpotifyPlaybackStore)) => ({
			/** Their own app is named: this player can drive Spotify. */
			spotifyHasOwnApp: computed(() => spotify.hasOwnApp()),
			/** The collector's own Spotify app, when they named one. */
			spotifyClientId: computed(() => spotify.clientId()),
			/** What that app has to send the sign-in back to. */
			spotifyRedirectUri: computed(() => spotify.redirectUri()),
			spotifyConnected: computed(() => spotify.connected()),
			spotifyConnecting: computed(
				() => spotify.status() === 'connecting'
			),
			/** Spotify Connect devices other than this browser. */
			devices: computed(() => spotify.otherDevices()),
			/** Chosen output device; null plays in this browser. */
			selectedDeviceId: computed(() => spotify.selectedDeviceId()),
			/** Volume the browser player starts at, 0–100. */
			spotifyBrowserVolume: computed(() => spotify.browserVolume()),
		})),
		withMethods((_store, spotify = inject(SpotifyPlaybackStore)) => ({
			connectSpotify(): Promise<void> {
				return spotify.connect();
			},

			/** Names the collector's own Spotify app (empty: forgets it). */
			saveSpotifyClientId(clientId: string): Promise<void> {
				return spotify.saveClientId(clientId);
			},

			disconnectSpotify(): void {
				spotify.disconnect();
			},

			refreshDevices(): Promise<void> {
				return spotify.refreshDevices();
			},

			/** Plays on the device from now on (null: this browser). */
			selectDevice(deviceId: string | null): Promise<void> {
				return spotify.selectDevice(deviceId);
			},

			/** The volume the browser player starts at, 0–100. */
			setSpotifyBrowserVolume(volumePercent: number): void {
				spotify.setBrowserVolume(volumePercent);
			},
		}))
	);
}
