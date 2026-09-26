import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	untracked,
	viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { isSpotifyTrackId } from '@music-collection/api';

import { ExternalPlayerConsentService } from '../../../data/external-player';
import { spotifyEmbedUri } from '../../../data/spotify';
import { SpotifyEmbedStore } from '../../spotify';

/** The frame is the taller album one unless it holds a single track. */
const ALBUM_HEIGHT = 352;
const TRACK_HEIGHT = 152;

/**
 * Spotify's embedded album player, or one track's with `trackId`. Needs no
 * token: a visitor signed in to Spotify in the browser hears the full tracks,
 * anyone else previews.
 *
 * The frame is put there by Spotify's own IFrame API rather than written into
 * the page, so the player above it can press play on it — for a collector
 * without their own Spotify app this frame is the whole of Spotify, and a
 * play button that could not reach it would be a button that does nothing.
 * Where that API will not load, the plain frame is still put on the page and
 * plays by its own buttons alone.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-spotify-player',
	imports: [...I18N_IMPORTS],
	template: `
		@if (plainSrc(); as plainSrc) {
			<iframe
				[src]="plainSrc"
				[title]="'Spotify player: ' + albumTitle()"
				width="100%"
				[height]="height()"
				loading="lazy"
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
			></iframe>
		} @else if (uri()) {
			<div #host class="frame" [style.min-height.px]="height()"></div>
		}
	`,
	styles: `
		:host {
			display: block;
		}

		iframe,
		.frame ::ng-deep iframe {
			display: block;
			border: 0;
			border-radius: var(--mc-radius-md);
		}
	`,
})
export class SpotifyPlayerComponent {
	private readonly sanitizer = inject(DomSanitizer);
	private readonly consent = inject(ExternalPlayerConsentService);
	protected readonly embed = inject(SpotifyEmbedStore);

	public readonly albumId = input.required<string>();
	/** Spotify track id: shows only that track. */
	public readonly trackId = input<string | null>(null);
	/** Album title, names the frame for screen readers. */
	public readonly albumTitle = input.required<string>();

	/**
	 * What the frame holds. Spotify has no privacy-enhanced host to fall back
	 * on, so without the collector's leave there is simply no frame — whoever
	 * places this player is not asked to remember that.
	 */
	protected readonly uri = computed(() =>
		this.consent.allowed()
			? spotifyEmbedUri(this.albumId(), this.trackId())
			: null
	);

	protected readonly height = computed(() =>
		isSpotifyTrackId(this.trackId()) ? TRACK_HEIGHT : ALBUM_HEIGHT
	);

	/**
	 * The same frame written into the page, for when Spotify's API will not
	 * load. It plays by its own buttons alone, so the player above it offers
	 * none of its own.
	 */
	protected readonly plainSrc = computed<SafeResourceUrl | null>(() => {
		const uri = this.uri();
		if (!uri || this.embed.status() !== 'unavailable') {
			return null;
		}
		// Only a validated id ever became a uri, so it is safe to trust.
		const [, kind, id] = uri.split(':');

		return this.sanitizer.bypassSecurityTrustResourceUrl(
			`https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`
		);
	});

	private readonly host = viewChild<ElementRef<HTMLElement>>('host');

	public constructor() {
		effect(() => {
			const uri = this.uri();
			const host = this.host()?.nativeElement;

			if (uri && host) {
				untracked(() => this.embed.show(host, uri, this.height()));
			}
		});

		// The page with the frame on it is gone: so is this side's hold on
		// it, and whatever it was playing.
		inject(DestroyRef).onDestroy(() => this.embed.detach());
	}
}
