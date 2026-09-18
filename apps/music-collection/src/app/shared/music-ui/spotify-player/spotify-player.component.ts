import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { isSpotifyAlbumId, isSpotifyTrackId } from '@music-collection/api';

/**
 * Spotify's embedded album player, or one track's with `trackId`. Needs no token: a visitor signed in to
 * Spotify in the browser hears the full tracks, anyone else previews.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-spotify-player',
	template: `
		@if (src(); as src) {
			<iframe
				[src]="src"
				[title]="'Spotify player: ' + albumTitle()"
				width="100%"
				[height]="trackId() ? 152 : 352"
				loading="lazy"
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
			></iframe>
		}
	`,
	styles: `
		:host {
			display: block;
		}

		iframe {
			display: block;
			border: 0;
			border-radius: var(--mc-radius-md);
		}
	`,
})
export class SpotifyPlayerComponent {
	private readonly sanitizer = inject(DomSanitizer);

	public readonly albumId = input.required<string>();
	/** Spotify track id: shows only that track. */
	public readonly trackId = input<string | null>(null);
	/** Album title, names the frame for screen readers. */
	public readonly albumTitle = input.required<string>();

	protected readonly src = computed<SafeResourceUrl | null>(() => {
		const trackId = this.trackId();
		// Only a validated id reaches the trusted URL.
		if (isSpotifyTrackId(trackId)) {
			return this.sanitizer.bypassSecurityTrustResourceUrl(
				`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
			);
		}
		const id = this.albumId();
		return isSpotifyAlbumId(id)
			? this.sanitizer.bypassSecurityTrustResourceUrl(
					`https://open.spotify.com/embed/album/${id}?utm_source=generator&theme=0`
				)
			: null;
	});
}
