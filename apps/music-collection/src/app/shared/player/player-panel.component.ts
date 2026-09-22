import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';

import { SpotifyPlayerComponent } from '../music-ui/spotify-player/spotify-player.component';
import { SpotifyIconComponent } from '../spotify/spotify-icon.component';
import { YoutubeIconComponent } from '../youtube/youtube-icon.component';
import { YoutubePanelComponent } from '../youtube/youtube-panel.component';
import { PlayerSettingsMenuComponent } from './player-settings-menu.component';
import { PlayerSideBreakComponent } from './player-side-break.component';
import { PlayerStationComponent } from './player-station.component';
import { PlayerStore } from './player.store';

/**
 * The player on an album or track page: controls for what the page shows,
 * the settings (source, output device, …), and what the source needs on the
 * page: Spotify's preview player until signed in, the YouTube video and its
 * picker.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-player-panel',
	imports: [
		SpotifyIconComponent,
		SpotifyPlayerComponent,
		YoutubeIconComponent,
		YoutubePanelComponent,
		PlayerSettingsMenuComponent,
		PlayerSideBreakComponent,
		PlayerStationComponent,
	],
	template: `
		@if (player.page(); as page) {
			<div class="head">
				@if (page.coverUrl) {
					<img class="art" [src]="page.coverUrl" alt="" />
				}
				<p class="text" aria-live="polite">
					<span class="title">{{ title() }}</span>
					<span class="subtitle">
						@switch (player.pageSource()) {
							@case ('spotify') {
								<mc-spotify-icon />
							}
							@case ('youtube') {
								<mc-youtube-icon />
							}
						}
						{{ page.artistName }}
					</span>
				</p>

				<div class="controls">
					@if (player.pageActive() && player.canSkip()) {
						<button
							type="button"
							class="icon-button"
							aria-label="Previous track"
							(click)="player.skip('previous')"
						>
							<i
								class="pi pi-step-backward"
								aria-hidden="true"
							></i>
						</button>
					}
					@if (player.pagePlayable()) {
						<button
							type="button"
							class="play"
							[class.youtube]="player.pageSource() === 'youtube'"
							[attr.aria-label]="
								player.pagePlaying() ? 'Pause' : 'Play'
							"
							(click)="player.togglePage()"
						>
							<i
								class="pi"
								[class.pi-pause]="player.pagePlaying()"
								[class.pi-play]="!player.pagePlaying()"
								aria-hidden="true"
							></i>
						</button>
					}
					@if (player.pageActive() && player.canSkip()) {
						<button
							type="button"
							class="icon-button"
							aria-label="Next track"
							(click)="player.skip('next')"
						>
							<i
								class="pi pi-step-forward"
								aria-hidden="true"
							></i>
						</button>
					}
					@if (player.pageActive() && player.volume() !== null) {
						<label class="volume">
							<i class="pi pi-volume-up" aria-hidden="true"></i>
							<input
								type="range"
								min="0"
								max="100"
								step="1"
								aria-label="Volume"
								[value]="player.volume()"
								[disabled]="!player.volumeSupported()"
								(input)="setVolume($event)"
							/>
						</label>
					}
					<button
						type="button"
						class="icon-button"
						aria-label="Open the full-screen player"
						title="Full screen"
						(click)="player.openStage()"
					>
						<i class="pi pi-window-maximize" aria-hidden="true"></i>
					</button>
					<mc-player-settings-menu class="settings" />
				</div>
			</div>

			<mc-player-station />

			<mc-player-side-break />

			@if (player.error(); as error) {
				<p class="error">{{ error }}</p>
			}

			@if (
				player.pageSource() === 'spotify' &&
				!player.spotifyConnected() &&
				page.spotifyAlbumId
			) {
				<mc-spotify-player
					[albumId]="page.spotifyAlbumId"
					[trackId]="page.spotifyTrackId"
					[albumTitle]="page.artistName + ' – ' + page.albumTitle"
				/>
				<p class="hint">
					This player only plays previews. Connect your Spotify
					Premium account (play button or settings) to play in full
					here or on your speakers.
				</p>
			}

			@if (youtubeAlbum(); as album) {
				<mc-youtube-panel [album]="album" />
			}
		}
	`,
	styles: `
		:host {
			display: grid;
			gap: 1rem;
		}

		.head {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem 1rem;
		}

		.art {
			width: 56px;
			height: 56px;
			flex: none;
			object-fit: cover;
			border-radius: var(--mc-radius-md);
		}

		.text {
			display: flex;
			flex: 1;
			flex-direction: column;
			min-width: 10rem;
			margin: 0;
			line-height: 1.3;
		}

		.title {
			font-weight: 700;
			color: var(--mc-text);
		}

		.subtitle {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}

		.controls {
			display: flex;
			align-items: center;
			gap: 0.375rem;
		}

		.icon-button {
			display: grid;
			place-items: center;
			width: 38px;
			height: 38px;
			padding: 0;
			border: 1px solid var(--mc-border-strong);
			border-radius: 50%;
			color: var(--mc-text);
			background: transparent;
			cursor: pointer;

			&:hover {
				background: var(--mc-surface-2);
			}
		}

		.play {
			display: grid;
			place-items: center;
			width: 48px;
			height: 48px;
			padding: 0;
			border: 0;
			border-radius: 50%;
			font-size: 1.1rem;
			color: var(--mc-on-spotify);
			background: var(--mc-spotify);
			cursor: pointer;
			transition: transform var(--mc-duration-fast) ease;

			&:hover {
				transform: scale(1.06);
			}

			&.youtube {
				color: #fff;
				background: #cc0029;
			}
		}

		.volume {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			color: var(--mc-text-muted);

			input {
				width: 6rem;
				accent-color: var(--mc-spotify);
			}
		}

		/* The dark menu button of the stage, in the page's colours. */
		.settings ::ng-deep .toggle {
			width: 38px;
			height: 38px;
			color: var(--mc-text);
			background: transparent;
			border-color: var(--mc-border-strong);
		}

		.hint {
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}

		.error {
			margin: 0;
			padding: 0.6rem 0.8rem;
			font-size: 0.8125rem;
			border-left: 4px solid #e5484d;
			border-radius: var(--mc-radius-md);
			background: var(--mc-surface-2);
		}

		button:focus-visible,
		input:focus-visible {
			outline: 2px solid var(--mc-spotify-text);
			outline-offset: 2px;
		}

		@media (max-width: 600px) {
			.volume {
				display: none;
			}
		}
	`,
})
export class PlayerPanelComponent {
	protected readonly player = inject(PlayerStore);

	protected readonly title = computed(() => {
		const page = this.player.page();
		if (this.player.pageActive()) {
			return this.player.now()?.title ?? '';
		}
		return page?.trackName ?? page?.albumTitle ?? '';
	});

	/** YouTube on the page: when it plays there, or the album has videos. */
	protected readonly youtubeAlbum = computed(() => {
		const album = this.player.pageYoutubeAlbum();
		if (!album?.items.length) {
			return null;
		}
		return this.player.pageSource() === 'youtube' ||
			album.items.some((item) => item.kind === 'video')
			? album
			: null;
	});

	protected setVolume(event: Event): void {
		this.player.setVolume(Number((event.target as HTMLInputElement).value));
	}
}
