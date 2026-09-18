import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { isSpotifyAlbumId } from '@music-collection/api';

/**
 * Spotify's embedded album player. Needs no token: a visitor signed in to
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
				height="352"
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
	/** Album title, names the frame for screen readers. */
	public readonly albumTitle = input.required<string>();

	protected readonly src = computed<SafeResourceUrl | null>(() => {
		const id = this.albumId();

		// Only a validated id reaches the trusted URL.
		return isSpotifyAlbumId(id)
			? this.sanitizer.bypassSecurityTrustResourceUrl(
					`https://open.spotify.com/embed/album/${id}?utm_source=generator&theme=0`
				)
			: null;
	});
}
