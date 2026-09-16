import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';

import { SpotifyIconComponent } from './spotify-icon.component';
import { SpotifyPlaybackStore } from './spotify-playback.store';

/**
 * The playing track in the app bar, so playback can be followed and
 * controlled from any page. Shown while Spotify is connected and something
 * is loaded; links to the album page when the album is in the catalog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-spotify-mini-player',
	imports: [NgTemplateOutlet, RouterLink, SpotifyIconComponent],
	template: `
		@if (spotify.connected() && spotify.nowPlaying(); as now) {
			<div class="player" role="group" aria-label="Spotify player">
				@if (albumLink(); as link) {
					<a
						class="now"
						[routerLink]="link"
						[attr.aria-label]="
							'Open album: ' + now.trackName + ', ' + now.artists
						"
					>
						<ng-container *ngTemplateOutlet="nowContent" />
					</a>
				} @else {
					<span class="now">
						<ng-container *ngTemplateOutlet="nowContent" />
					</span>
				}

				<ng-template #nowContent>
					@if (now.imageUrl) {
						<img class="art" [src]="now.imageUrl" alt="" />
					} @else {
						<mc-spotify-icon class="art-icon" />
					}
					<span class="text" aria-live="polite">
						<span class="track">{{ now.trackName }}</span>
						<span class="artists">{{ now.artists }}</span>
					</span>
				</ng-template>

				<button
					type="button"
					class="control secondary"
					aria-label="Previous track"
					(click)="spotify.skip('previous')"
				>
					<i class="pi pi-step-backward" aria-hidden="true"></i>
				</button>
				<button
					type="button"
					class="control primary"
					[attr.aria-label]="now.paused ? 'Play' : 'Pause'"
					(click)="spotify.togglePlay()"
				>
					<i
						class="pi"
						[class.pi-play]="now.paused"
						[class.pi-pause]="!now.paused"
						aria-hidden="true"
					></i>
				</button>
				<button
					type="button"
					class="control secondary"
					aria-label="Next track"
					(click)="spotify.skip('next')"
				>
					<i class="pi pi-step-forward" aria-hidden="true"></i>
				</button>
			</div>
		}
	`,
	styles: `
		:host {
			display: contents;
		}

		.player {
			display: flex;
			align-items: center;
			gap: 0.25rem;
			height: 44px;
			margin-right: 0.5rem;
			padding: 0 0.25rem 0 0.25rem;
			border: 1px solid var(--mc-border);
			border-radius: 999px;
			background: var(--mc-card-bg);
		}

		.now {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			min-width: 0;
			padding-right: 0.35rem;
			color: inherit;
			text-decoration: none;
			border-radius: 999px;
		}

		a.now:hover .track {
			text-decoration: underline;
		}

		.art {
			width: 34px;
			height: 34px;
			flex-shrink: 0;
			object-fit: cover;
			border-radius: 50%;
		}

		.art-icon {
			font-size: 1.6rem;
			margin-left: 0.25rem;
		}

		.text {
			display: flex;
			flex-direction: column;
			min-width: 0;
			max-width: 14rem;
			line-height: 1.2;
		}

		.track,
		.artists {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.track {
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--mc-text);
		}

		.artists {
			font-size: 0.72rem;
			color: var(--mc-text-muted);
		}

		.control {
			display: inline-grid;
			place-items: center;
			width: 36px;
			height: 36px;
			flex-shrink: 0;
			padding: 0;
			border: 0;
			border-radius: 50%;
			background: transparent;
			color: var(--mc-text-muted);
			cursor: pointer;

			&:hover {
				color: var(--mc-text);
				background: var(--mc-surface-2);
			}

			&.primary {
				color: var(--mc-on-spotify);
				background: var(--mc-spotify);
			}
		}

		.now:focus-visible,
		.control:focus-visible {
			outline: 2px solid var(--mc-spotify-text);
			outline-offset: 2px;
		}

		/* Narrower screens: cover and play/pause only. */
		@media (max-width: 1100px) {
			.text {
				display: none;
			}
		}

		@media (max-width: 768px) {
			.secondary {
				display: none;
			}

			.player {
				margin-right: 0.25rem;
			}
		}
	`,
})
export class SpotifyMiniPlayerComponent {
	private readonly albumStateService = inject(AlbumStateService);
	protected readonly spotify = inject(SpotifyPlaybackStore);

	private readonly albums = toSignal(
		this.albumStateService.selectEntities$(),
		{
			initialValue: [],
		}
	);

	/** Our album page of the playing Spotify album, if it is in the catalog. */
	protected readonly albumLink = computed(() => {
		const uri = this.spotify.nowPlaying()?.albumUri ?? '';
		const spotifyAlbumId = uri.replace('spotify:album:', '');
		const album = spotifyAlbumId
			? this.albums().find(
					(item) => item.spotifyAlbumId === spotifyAlbumId
				)
			: undefined;

		return album ? ['/album', album.uid] : null;
	});
}
