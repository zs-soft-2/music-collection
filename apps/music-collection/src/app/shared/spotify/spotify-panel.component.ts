import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';

import { SpotifyPlayerComponent } from '../music-ui';
import { SpotifyPlaybackStore } from './spotify-playback.store';

/**
 * Listening on the album page. Signed in to Spotify: full playback in this
 * browser or on another Spotify Connect device. Otherwise Spotify's embedded
 * player (previews) and the option to connect.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-spotify-panel',
	imports: [SpotifyPlayerComponent],
	template: `
		@if (spotify.connected()) {
			<div class="now-playing">
				@if (spotify.nowPlaying(); as now) {
					@if (now.imageUrl) {
						<img class="art" [src]="now.imageUrl" alt="" />
					}
					<p class="track" aria-live="polite">
						<span class="track-name">{{ now.trackName }}</span>
						<span class="artists">{{ now.artists }}</span>
					</p>
				} @else {
					<p class="track">
						<span class="track-name">Ready to play</span>
						<span class="artists">{{ albumTitle() }}</span>
					</p>
				}

				<div class="controls">
					@if (playsThisAlbum()) {
						<button
							type="button"
							class="icon-button"
							aria-label="Previous track"
							(click)="spotify.skip('previous')"
						>
							<i
								class="pi pi-step-backward"
								aria-hidden="true"
							></i>
						</button>
						<button
							type="button"
							class="icon-button primary"
							[attr.aria-label]="
								spotify.nowPlaying()?.paused ? 'Play' : 'Pause'
							"
							(click)="spotify.togglePlay()"
						>
							<i
								class="pi"
								[class.pi-play]="spotify.nowPlaying()?.paused"
								[class.pi-pause]="!spotify.nowPlaying()?.paused"
								aria-hidden="true"
							></i>
						</button>
						<button
							type="button"
							class="icon-button"
							aria-label="Next track"
							(click)="spotify.skip('next')"
						>
							<i
								class="pi pi-step-forward"
								aria-hidden="true"
							></i>
						</button>
					} @else {
						<button
							type="button"
							class="button"
							(click)="spotify.play(albumId(), null)"
						>
							<i class="pi pi-play" aria-hidden="true"></i>
							Play album
						</button>
					}
				</div>
			</div>

			<div class="output">
				<label for="spotify-device">Play on</label>
				<select id="spotify-device" (change)="selectDevice($event)">
					<option value="" [selected]="!spotify.selectedDeviceId()">
						This browser
					</option>
					@for (device of spotify.otherDevices(); track device.id) {
						<option
							[value]="device.id"
							[selected]="
								device.id === spotify.selectedDeviceId()
							"
						>
							{{ device.name }} ({{ device.type }})
						</option>
					}
				</select>
				<button
					type="button"
					class="icon-button"
					aria-label="Refresh device list"
					(click)="spotify.refreshDevices()"
				>
					<i class="pi pi-refresh" aria-hidden="true"></i>
				</button>
				<button
					type="button"
					class="text-button"
					(click)="spotify.disconnect()"
				>
					Disconnect Spotify
				</button>
			</div>
			<p class="hint">
				Your amplifier or speaker is listed when it supports Spotify
				Connect and is switched on. Missing? Play something on it once
				from the Spotify app, then refresh the list.
			</p>
		} @else {
			<mc-spotify-player
				[albumId]="albumId()"
				[albumTitle]="albumTitle()"
			/>

			@if (spotify.configured()) {
				<div class="connect">
					<p>
						This player only plays previews. Connect your Spotify
						Premium account to play the full album here or on your
						speakers.
					</p>
					<button
						type="button"
						class="button"
						[disabled]="spotify.status() === 'connecting'"
						(click)="spotify.connect()"
					>
						@if (spotify.status() === 'connecting') {
							Connecting…
						} @else {
							Connect Spotify
						}
					</button>
				</div>
			}
		}

		@if (spotify.error(); as error) {
			<div class="error" role="alert">
				<span>{{ error }}</span>
				<button
					type="button"
					class="icon-button"
					aria-label="Dismiss message"
					(click)="spotify.dismissError()"
				>
					<i class="pi pi-times" aria-hidden="true"></i>
				</button>
			</div>
		}
	`,
	styles: `
		:host {
			display: grid;
			gap: 0.75rem;
		}

		.now-playing,
		.connect {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem 1rem;
			padding: 0.9rem 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
		}

		.art {
			width: 3.5rem;
			height: 3.5rem;
			object-fit: cover;
			border-radius: 4px;
		}

		.track {
			display: flex;
			flex: 1 1 12rem;
			flex-direction: column;
			gap: 0.15rem;
			min-width: 0;
			margin: 0;
		}

		.track-name {
			font-weight: 600;
		}

		.artists,
		.hint {
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.controls,
		.output {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;
		}

		.connect p {
			flex: 1 1 16rem;
			margin: 0;
		}

		.output label {
			font-size: 0.85rem;
			font-weight: 600;
		}

		select {
			min-width: 0;
			max-width: 100%;
			padding: 0.45rem 0.6rem;
			color: var(--mc-text);
			font: inherit;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
		}

		.hint {
			margin: 0;
		}

		.button {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.6rem 1.1rem;
			font: inherit;
			font-weight: 600;
			color: #fff;
			background: var(--mc-primary);
			border: 0;
			border-radius: var(--mc-radius-md);
			cursor: pointer;

			&:disabled {
				opacity: 0.6;
				cursor: default;
			}
		}

		.icon-button {
			display: inline-grid;
			place-items: center;
			width: 2.5rem;
			height: 2.5rem;
			color: var(--mc-text);
			background: transparent;
			border: 1px solid var(--mc-border);
			border-radius: 50%;
			cursor: pointer;

			&.primary {
				color: #fff;
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}
		}

		.text-button {
			padding: 0.4rem 0.2rem;
			font: inherit;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
			background: none;
			border: 0;
			text-decoration: underline;
			cursor: pointer;
		}

		.error {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			padding: 0.5rem 0.5rem 0.5rem 1rem;
			border: 1px solid var(--mc-border);
			border-left: 4px solid #e5484d;
			border-radius: var(--mc-radius-md);
		}

		button:focus-visible,
		select:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 2px;
		}
	`,
})
export class SpotifyPanelComponent {
	protected readonly spotify = inject(SpotifyPlaybackStore);

	/** Spotify album id. */
	public readonly albumId = input.required<string>();
	public readonly albumTitle = input.required<string>();

	protected readonly playsThisAlbum = computed(
		() =>
			this.spotify.nowPlaying()?.albumUri ===
			`spotify:album:${this.albumId()}`
	);

	protected selectDevice(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;
		void this.spotify.selectDevice(value || null);
	}
}
