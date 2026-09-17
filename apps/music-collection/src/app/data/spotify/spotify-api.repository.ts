import { Injectable } from '@angular/core';

import {
	SpotifyAlbumTrack,
	SpotifyDevice,
	SpotifyNowPlaying,
} from './spotify.model';

const API = 'https://api.spotify.com/v1';

interface ApiImage {
	url: string;
}

interface ApiTrack {
	uri: string;
	name: string;
	disc_number: number;
	track_number: number;
	artists?: { name: string }[];
	album?: { uri: string; images: ApiImage[] };
}

interface ApiPage<T> {
	items: T[];
	next: string | null;
}

interface ApiPlayer {
	is_playing: boolean;
	device: { id: string | null; volume_percent: number | null } | null;
	item: ApiTrack | null;
}

interface ApiDevice {
	id: string | null;
	name: string;
	type: string;
	is_active: boolean;
	volume_percent: number | null;
	supports_volume?: boolean;
}

/** Spotify Web API calls (playback control, devices, album tracks). */
@Injectable({ providedIn: 'root' })
export class SpotifyApiRepository {
	public async albumTracks(
		accessToken: string,
		albumId: string
	): Promise<SpotifyAlbumTrack[]> {
		const tracks: SpotifyAlbumTrack[] = [];
		let url: string | null = `${API}/albums/${albumId}/tracks?limit=50`;

		while (url) {
			const page: ApiPage<ApiTrack> = await this.request(
				accessToken,
				'GET',
				url
			);
			tracks.push(
				...page.items.map((track) => ({
					uri: track.uri,
					name: track.name,
					discNumber: track.disc_number,
					trackNumber: track.track_number,
				}))
			);
			url = page.next;
		}
		return tracks;
	}

	/** Plays the album on the device, from the given track when set. */
	public play(
		accessToken: string,
		deviceId: string,
		albumId: string,
		trackUri: string | null
	): Promise<void> {
		return this.request(
			accessToken,
			'PUT',
			`${API}/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
			{
				context_uri: `spotify:album:${albumId}`,
				...(trackUri ? { offset: { uri: trackUri } } : {}),
			}
		);
	}

	public resume(accessToken: string): Promise<void> {
		return this.request(accessToken, 'PUT', `${API}/me/player/play`);
	}

	public pause(accessToken: string): Promise<void> {
		return this.request(accessToken, 'PUT', `${API}/me/player/pause`);
	}

	public next(accessToken: string): Promise<void> {
		return this.request(accessToken, 'POST', `${API}/me/player/next`);
	}

	public previous(accessToken: string): Promise<void> {
		return this.request(accessToken, 'POST', `${API}/me/player/previous`);
	}

	/** Sets the volume (0–100) of the device. */
	public setVolume(
		accessToken: string,
		deviceId: string,
		volumePercent: number
	): Promise<void> {
		return this.request(
			accessToken,
			'PUT',
			`${API}/me/player/volume?volume_percent=${volumePercent}&device_id=${encodeURIComponent(deviceId)}`
		);
	}

	public async devices(accessToken: string): Promise<SpotifyDevice[]> {
		const result: { devices: ApiDevice[] } = await this.request(
			accessToken,
			'GET',
			`${API}/me/player/devices`
		);

		return result.devices
			.filter((device) => !!device.id)
			.map((device) => ({
				id: device.id as string,
				name: device.name,
				type: device.type,
				isActive: device.is_active,
				volumePercent: device.volume_percent,
				supportsVolume: device.supports_volume ?? true,
			}));
	}

	/** Moves the current playback to the device. */
	public transfer(
		accessToken: string,
		deviceId: string,
		play: boolean
	): Promise<void> {
		return this.request(accessToken, 'PUT', `${API}/me/player`, {
			device_ids: [deviceId],
			play,
		});
	}

	public async nowPlaying(
		accessToken: string
	): Promise<SpotifyNowPlaying | null> {
		const player: ApiPlayer | null = await this.request(
			accessToken,
			'GET',
			`${API}/me/player`
		);
		const item = player?.item;
		if (!item) {
			return null;
		}

		return {
			trackUri: item.uri,
			trackName: item.name,
			artists: (item.artists ?? []).map((a) => a.name).join(', '),
			albumUri: item.album?.uri ?? '',
			imageUrl: item.album?.images.at(-1)?.url ?? null,
			paused: !player.is_playing,
			deviceId: player.device?.id ?? null,
			volumePercent: player.device?.volume_percent ?? null,
		};
	}

	private async request<T>(
		accessToken: string,
		method: string,
		url: string,
		body?: unknown
	): Promise<T> {
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				...(body ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const detail = await response
				.json()
				.then((json) => json?.error?.message as string | undefined)
				.catch(() => undefined);
			throw new SpotifyApiError(response.status, detail);
		}
		const text = await response.text();

		return (text ? JSON.parse(text) : null) as T;
	}
}

export class SpotifyApiError extends Error {
	public constructor(
		public readonly status: number,
		detail?: string
	) {
		super(detail ?? `Spotify request failed (${status}).`);
	}
}
