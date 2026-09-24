import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { PlayerStore } from '../../../../shared/player';

/**
 * Where Spotify plays and how loud it starts. The output device belongs to
 * the Spotify account, so it follows the user; the volume is this browser's
 * own, because the speakers are.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-spotify',
	imports: [...I18N_IMPORTS],
	template: `
		@if (!player.spotifyConfigured()) {
			<p class="note">
				{{ 'ui.profileSpotify.spotify-is-not-set' | transloco }}
			</p>
		} @else {
			<div class="connection">
				@if (player.spotifyConnected()) {
					<p class="state">
						<i class="pi pi-check-circle" aria-hidden="true"></i>
						{{ 'ui.profileSpotify.connected' | transloco }}
					</p>
					<button
						type="button"
						class="link"
						(click)="player.disconnectSpotify()"
					>
						{{ 'ui.profileSpotify.disconnect' | transloco }}
					</button>
				} @else {
					<button
						type="button"
						class="connect"
						[disabled]="player.spotifyConnecting()"
						(click)="player.connectSpotify()"
					>
						{{
							player.spotifyConnecting()
								? 'Connecting…'
								: 'Connect Spotify (Premium)'
						}}
					</button>
				}
			</div>

			@if (player.spotifyConnected()) {
				<div class="output">
					<span class="label">{{
						'ui.profileSpotify.play-on' | transloco
					}}</span>

					<div class="device-row">
						<select
							[attr.aria-label]="
								'ui.profileSpotify.play-spotify-on' | transloco
							"
							(change)="selectDevice($event)"
						>
							<option
								value=""
								[selected]="!player.selectedDeviceId()"
							>
								{{
									'ui.profileSpotify.this-browser' | transloco
								}}
							</option>
							@for (device of player.devices(); track device.id) {
								<option
									[value]="device.id"
									[selected]="
										device.id === player.selectedDeviceId()
									"
								>
									{{ device.name }} ({{ device.type }})
								</option>
							}
						</select>

						<button
							type="button"
							class="refresh"
							[attr.aria-label]="
								'ui.profileSpotify.refresh-device-list'
									| transloco
							"
							[title]="
								'ui.profileSpotify.refresh-device-list2'
									| transloco
							"
							(click)="player.refreshDevices()"
						>
							<i class="pi pi-refresh" aria-hidden="true"></i>
						</button>
					</div>

					<p class="note">
						{{
							'ui.profileSpotify.speakers-show-up-when'
								| transloco
						}}
					</p>
				</div>
			}

			<div class="volume">
				<label class="label" for="mc-spotify-volume">
					{{ 'ui.profileSpotify.volume-in-this-browser' | transloco }}
				</label>

				<div class="slider-row">
					<input
						id="mc-spotify-volume"
						type="range"
						min="0"
						max="100"
						step="1"
						[value]="player.spotifyBrowserVolume()"
						(input)="setVolume($event)"
					/>
					<span class="value"
						>{{ player.spotifyBrowserVolume() }}%</span
					>
				</div>

				<p class="note">
					{{
						'ui.profileSpotify.what-the-browser-player' | transloco
					}}
				</p>
			</div>
		}
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
		}

		.connection {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
		}

		.state {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			margin: 0;
			font-size: 0.875rem;
			color: var(--mc-spotify-text);
		}

		.connect {
			padding: 0.5rem 1rem;
			font: inherit;
			font-size: 0.875rem;
			font-weight: 600;
			color: var(--mc-on-spotify);
			background: var(--mc-spotify);
			border: 0;
			border-radius: 999px;
			cursor: pointer;

			&:disabled {
				opacity: 0.6;
				cursor: default;
			}
		}

		.link {
			padding: 0;
			font: inherit;
			font-size: 0.8125rem;
			color: var(--mc-text-subtle);
			background: none;
			border: 0;
			text-decoration: underline;
			cursor: pointer;

			&:hover {
				color: var(--mc-text);
			}
		}

		.label {
			display: block;
			margin-bottom: 0.5rem;
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.device-row {
			display: flex;
			gap: 0.5rem;
		}

		select {
			flex: 1 1 auto;
			min-width: 0;
			padding: 0.45rem 0.6rem;
			font: inherit;
			font-size: 0.875rem;
			color: var(--mc-text);
			background: var(--mc-bg-muted);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
		}

		.refresh {
			display: grid;
			place-items: center;
			width: 2.25rem;
			color: var(--mc-text-muted);
			background: var(--mc-surface-2);
			border: 0;
			border-radius: var(--mc-radius-md);
			cursor: pointer;

			&:hover {
				color: var(--mc-text);
			}
		}

		.slider-row {
			display: flex;
			align-items: center;
			gap: 0.75rem;
		}

		input[type='range'] {
			flex: 1 1 12rem;
			accent-color: var(--mc-primary);
		}

		.value {
			min-width: 3ch;
			font-size: 0.875rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		.note {
			max-width: 52ch;
			margin: 0.5rem 0 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}
	`,
})
export class ProfileSpotifyComponent {
	protected readonly player = inject(PlayerStore);

	protected selectDevice(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;

		void this.player.selectDevice(value || null);
	}

	protected setVolume(event: Event): void {
		this.player.setSpotifyBrowserVolume(
			Number((event.target as HTMLInputElement).value)
		);
	}
}
