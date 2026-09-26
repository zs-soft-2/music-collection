import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { PlayerStore } from '../../../../shared/player';

/**
 * The collector's own Spotify app, where Spotify plays and how loud it
 * starts.
 *
 * The app is theirs because Spotify counts the people who sign in through
 * one: an app in development mode takes twenty-five, so a single shared app
 * would spend those on whoever arrived first. Naming it costs them a few
 * minutes in Spotify's dashboard, and until they do there is no Spotify here
 * at all. The output device belongs to their Spotify account, so it follows
 * them; the volume is this browser's own, because the speakers are.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-spotify',
	imports: [...I18N_IMPORTS],
	template: `
		@if (!player.spotifyHasOwnApp() || editingApp()) {
			<div class="app-setup">
				<p class="note">
					{{ 'ui.profileSpotify.your-own-app-explained' | transloco }}
				</p>

				<ol class="steps">
					<li>
						{{ 'ui.profileSpotify.step-create-app' | transloco }}
					</li>
					<li>
						{{ 'ui.profileSpotify.step-redirect-uri' | transloco }}
						<code>{{ player.spotifyRedirectUri() }}</code>
					</li>
					<li>
						{{
							'ui.profileSpotify.step-copy-client-id' | transloco
						}}
					</li>
				</ol>

				<p class="note">
					{{
						'ui.profileSpotify.same-account-and-premium' | transloco
					}}
				</p>

				<form class="app-form" (submit)="saveApp($event)">
					<label class="label" for="mc-spotify-client-id">
						{{ 'ui.profileSpotify.client-id' | transloco }}
					</label>
					<div class="app-row">
						<input
							id="mc-spotify-client-id"
							name="clientId"
							type="text"
							autocomplete="off"
							spellcheck="false"
							[value]="player.spotifyClientId() ?? ''"
							[placeholder]="
								'ui.profileSpotify.client-id-placeholder'
									| transloco
							"
						/>
						<button type="submit" class="connect">
							{{ 'ui.profileSpotify.save-app' | transloco }}
						</button>
					</div>
				</form>

				@if (editingApp()) {
					<button
						type="button"
						class="link"
						(click)="editingApp.set(false)"
					>
						{{ 'ui.profileSpotify.cancel' | transloco }}
					</button>
				}
			</div>
		} @else {
			<div class="app-named">
				<p class="state">
					{{ 'ui.profileSpotify.your-app' | transloco }}
					<code>{{ player.spotifyClientId() }}</code>
				</p>
				<button
					type="button"
					class="link"
					(click)="editingApp.set(true)"
				>
					{{ 'ui.profileSpotify.change-app' | transloco }}
				</button>
				<button type="button" class="link" (click)="forgetApp()">
					{{ 'ui.profileSpotify.forget-app' | transloco }}
				</button>
			</div>

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

		.app-setup {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.steps {
			max-width: 52ch;
			margin: 0;
			padding-left: 1.2rem;
			font-size: 0.8125rem;
			line-height: 1.6;
			color: var(--mc-text-muted);
		}

		code {
			padding: 0.1rem 0.35rem;
			font-size: 0.8125rem;
			color: var(--mc-text);
			background: var(--mc-bg-muted);
			border-radius: var(--mc-radius-sm);
			overflow-wrap: anywhere;
		}

		.app-form {
			width: 100%;
			max-width: 32rem;
		}

		.app-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		input[type='text'] {
			flex: 1 1 16rem;
			min-width: 0;
			padding: 0.45rem 0.6rem;
			font: inherit;
			font-size: 0.875rem;
			color: var(--mc-text);
			background: var(--mc-bg-muted);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
		}

		.app-named {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
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

	/** Their app is named, and they are naming another one. */
	protected readonly editingApp = signal(false);

	protected async saveApp(event: Event): Promise<void> {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const clientId = (
			form.elements.namedItem('clientId') as HTMLInputElement
		).value;

		await this.player.saveSpotifyClientId(clientId);
		this.editingApp.set(false);
	}

	protected async forgetApp(): Promise<void> {
		await this.player.saveSpotifyClientId('');
		this.editingApp.set(false);
	}

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
