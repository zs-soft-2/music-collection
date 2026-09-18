import { Injectable } from '@angular/core';

const BROWSER_VOLUME_KEY = 'mc-spotify-browser-volume';
/** Volume of the browser player before it is first changed, 0–100. */
const DEFAULT_BROWSER_VOLUME = 80;

/** Spotify player settings kept in this browser. */
@Injectable({ providedIn: 'root' })
export class SpotifyPreferencesRepository {
	/** Last volume of the browser player, 0–100. */
	public loadBrowserVolume(): number {
		try {
			const stored = localStorage.getItem(BROWSER_VOLUME_KEY);
			const volume = stored === null ? NaN : Number(stored);
			return volume >= 0 && volume <= 100
				? volume
				: DEFAULT_BROWSER_VOLUME;
		} catch {
			return DEFAULT_BROWSER_VOLUME;
		}
	}

	public saveBrowserVolume(volumePercent: number): void {
		try {
			localStorage.setItem(BROWSER_VOLUME_KEY, String(volumePercent));
		} catch {
			// Storage unavailable (e.g. blocked): the volume is not remembered.
		}
	}
}
