import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { YoutubeIconComponent } from './youtube-icon.component';
import { YoutubePlaybackStore } from './youtube-playback.store';

/**
 * What plays on YouTube, in the app bar, so it can be followed and
 * controlled from any page. Shown once something has played.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-youtube-mini-player',
	imports: [RouterLink, YoutubeIconComponent],
	template: `
		@if (youtube.started() && youtube.album(); as album) {
			<div class="player" role="group" aria-label="YouTube player">
				<a
					class="now"
					[routerLink]="['/album', album.uid]"
					[attr.aria-label]="'Open album: ' + album.title"
				>
					@if (album.coverUrl) {
						<img class="art" [src]="album.coverUrl" alt="" />
					} @else {
						<mc-youtube-icon class="art-icon" />
					}
					<span class="text" aria-live="polite">
						<span class="track">{{
							youtube.nowPlayingTitle() ?? album.title
						}}</span>
						<span class="artists">{{ album.artistName }}</span>
					</span>
				</a>

				@if (isPlaylist()) {
					<button
						type="button"
						class="control secondary"
						aria-label="Previous track"
						(click)="youtube.skip('previous')"
					>
						<i class="pi pi-step-backward" aria-hidden="true"></i>
					</button>
				}
				<button
					type="button"
					class="control primary"
					[attr.aria-label]="youtube.playing() ? 'Pause' : 'Play'"
					(click)="youtube.togglePlay()"
				>
					<i
						class="pi"
						[class.pi-play]="!youtube.playing()"
						[class.pi-pause]="youtube.playing()"
						aria-hidden="true"
					></i>
				</button>
				@if (isPlaylist()) {
					<button
						type="button"
						class="control secondary"
						aria-label="Next track"
						(click)="youtube.skip('next')"
					>
						<i class="pi pi-step-forward" aria-hidden="true"></i>
					</button>
				}
				<button
					type="button"
					class="control secondary"
					aria-label="Close YouTube player"
					(click)="youtube.close()"
				>
					<i class="pi pi-times" aria-hidden="true"></i>
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
			padding: 0 0.25rem;
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
			font-size: 1.4rem;
			margin-left: 0.35rem;
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
				color: #fff;
				background: #cc0029;
			}
		}

		.now:focus-visible,
		.control:focus-visible {
			outline: 2px solid #ff0033;
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
export class YoutubeMiniPlayerComponent {
	protected readonly youtube = inject(YoutubePlaybackStore);

	protected readonly isPlaylist = computed(
		() => this.youtube.selection()?.kind === 'playlist'
	);
}
