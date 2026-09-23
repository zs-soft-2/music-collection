import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';

import {
	PLAYER_CONTEXT_LABELS,
	PlayerBackdrop,
	PlayerEffects,
	PlayerSettings,
	PlayerSourceSetting,
	PlayerView,
} from '../../data/player';
import { PlayerStore } from './player.store';

interface Choice<T> {
	value: T;
	label: string;
}

/**
 * The player's settings behind a gear button. Changes apply to the current
 * kind of page (track, album, …) and are kept for the user.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-player-settings-menu',
	template: `
		<button
			type="button"
			class="toggle"
			aria-label="Player settings"
			[attr.aria-expanded]="open()"
			(click)="open.set(!open())"
		>
			<i class="pi pi-cog" aria-hidden="true"></i>
		</button>

		@if (open()) {
			<div class="menu" role="group" aria-label="Player settings">
				<p class="scope">Settings for {{ contextLabel() }}</p>

				<fieldset>
					<legend>Play on</legend>
					@for (choice of sources; track choice.value) {
						<button
							type="button"
							[class.selected]="
								settings().source === choice.value
							"
							[disabled]="!sourceAvailable(choice.value)"
							(click)="set({ source: choice.value })"
						>
							{{ choice.label }}
						</button>
					}
				</fieldset>

				@if (player.spotifyConfigured()) {
					<div class="output">
						<span class="legend">Spotify output</span>
						@if (player.spotifyConnected()) {
							<div class="device-row">
								<select
									aria-label="Play Spotify on"
									(change)="selectDevice($event)"
								>
									<option
										value=""
										[selected]="!player.selectedDeviceId()"
									>
										This browser
									</option>
									@for (
										device of player.devices();
										track device.id
									) {
										<option
											[value]="device.id"
											[selected]="
												device.id ===
												player.selectedDeviceId()
											"
										>
											{{ device.name }} ({{
												device.type
											}})
										</option>
									}
								</select>
								<button
									type="button"
									class="refresh"
									aria-label="Refresh device list"
									title="Refresh device list"
									(click)="player.refreshDevices()"
								>
									<i
										class="pi pi-refresh"
										aria-hidden="true"
									></i>
								</button>
							</div>
							<p class="note">
								Speakers show up when they support Spotify
								Connect and are on. Missing? Play something on
								it once from the Spotify app, then refresh.
							</p>
							<button
								type="button"
								class="reset"
								(click)="player.disconnectSpotify()"
							>
								Disconnect Spotify
							</button>
						} @else {
							<button
								type="button"
								class="connect"
								[disabled]="player.spotifyConnecting()"
								(click)="player.connectSpotify()"
							>
								Connect Spotify (Premium)
							</button>
						}
					</div>
				}

				<fieldset>
					<legend>Open as</legend>
					@for (choice of views; track choice.value) {
						<button
							type="button"
							[class.selected]="settings().view === choice.value"
							(click)="set({ view: choice.value })"
						>
							{{ choice.label }}
						</button>
					}
				</fieldset>

				<fieldset>
					<legend>Backdrop</legend>
					@for (choice of backdrops; track choice.value) {
						<button
							type="button"
							[class.selected]="
								settings().backdrop === choice.value
							"
							(click)="set({ backdrop: choice.value })"
						>
							{{ choice.label }}
						</button>
					}
				</fieldset>

				<fieldset>
					<legend>Effects</legend>
					@for (choice of effects; track choice.value) {
						<button
							type="button"
							[class.selected]="
								settings().effects === choice.value
							"
							(click)="set({ effects: choice.value })"
						>
							{{ choice.label }}
						</button>
					}
				</fieldset>

				<label class="switch">
					<input
						type="checkbox"
						[checked]="settings().lyrics"
						(change)="set({ lyrics: !settings().lyrics })"
					/>
					<span>Show lyrics</span>
				</label>
				<label class="switch">
					<input
						type="checkbox"
						[checked]="settings().autoAdvance"
						(change)="set({ autoAdvance: !settings().autoAdvance })"
					/>
					<span>Play on to the next track</span>
				</label>
				@if (player.hasSides()) {
					<label class="switch">
						<input
							type="checkbox"
							[checked]="settings().sideBreak"
							(change)="set({ sideBreak: !settings().sideBreak })"
						/>
						<span>Stop to turn the record over</span>
					</label>
				}

				<button
					type="button"
					class="reset"
					(click)="player.resetSettings()"
				>
					Reset to defaults
				</button>
			</div>
		}
	`,
	styles: `
		:host {
			position: relative;
		}

		.toggle {
			display: grid;
			place-items: center;
			width: 40px;
			height: 40px;
			border: 1px solid rgb(255 255 255 / 0.2);
			border-radius: 50%;
			color: #fff;
			background: rgb(0 0 0 / 0.3);
			cursor: pointer;

			&:hover,
			&[aria-expanded='true'] {
				background: rgb(255 255 255 / 0.12);
			}
		}

		.menu {
			position: absolute;
			top: calc(100% + 0.5rem);
			right: 0;
			z-index: 2;
			display: flex;
			flex-direction: column;
			gap: 0.875rem;
			width: min(18rem, calc(100vw - 2rem));
			max-height: min(36rem, calc(100vh - 6rem));
			overflow-y: auto;
			padding: 1rem;
			color: #fff;
			background: rgb(20 20 20 / 0.92);
			border: 1px solid rgb(255 255 255 / 0.12);
			border-radius: var(--mc-radius-lg);
			box-shadow: 0 20px 40px rgb(0 0 0 / 0.5);
			backdrop-filter: blur(12px);
		}

		.scope {
			margin: 0;
			font-size: 0.6875rem;
			font-weight: 700;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: rgb(255 255 255 / 0.55);
		}

		fieldset {
			display: flex;
			gap: 0.25rem;
			margin: 0;
			padding: 0;
			border: 0;

			legend {
				margin-bottom: 0.375rem;
				padding: 0;
				font-size: 0.75rem;
				color: rgb(255 255 255 / 0.7);
			}

			button {
				flex: 1;
				height: 30px;
				font: inherit;
				font-size: 0.75rem;
				font-weight: 600;
				color: rgb(255 255 255 / 0.8);
				background: rgb(255 255 255 / 0.06);
				border: 1px solid transparent;
				border-radius: var(--mc-radius-sm);
				cursor: pointer;

				&:hover:not(:disabled) {
					background: rgb(255 255 255 / 0.12);
				}

				&.selected {
					color: #fff;
					border-color: rgb(255 90 40 / 0.8);
					background: rgb(255 70 30 / 0.2);
				}

				&:disabled {
					opacity: 0.35;
					cursor: not-allowed;
				}
			}
		}

		.output {
			display: flex;
			flex-direction: column;
			gap: 0.375rem;
		}

		.legend {
			font-size: 0.75rem;
			color: rgb(255 255 255 / 0.7);
		}

		.device-row {
			display: flex;
			gap: 0.25rem;

			select {
				flex: 1;
				min-width: 0;
				height: 30px;
				padding: 0 0.5rem;
				font: inherit;
				font-size: 0.75rem;
				color: #fff;
				background: rgb(255 255 255 / 0.06);
				border: 1px solid rgb(255 255 255 / 0.15);
				border-radius: var(--mc-radius-sm);

				option {
					color: #000;
				}
			}
		}

		.refresh {
			width: 30px;
			height: 30px;
			padding: 0;
			font-size: 0.75rem;
			color: #fff;
			background: rgb(255 255 255 / 0.06);
			border: 1px solid rgb(255 255 255 / 0.15);
			border-radius: var(--mc-radius-sm);
			cursor: pointer;
		}

		.note {
			margin: 0;
			font-size: 0.6875rem;
			line-height: 1.4;
			color: rgb(255 255 255 / 0.5);
		}

		.connect {
			height: 32px;
			font: inherit;
			font-size: 0.75rem;
			font-weight: 700;
			color: var(--mc-on-spotify);
			background: var(--mc-spotify);
			border: 0;
			border-radius: 16px;
			cursor: pointer;
		}

		.switch {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.8125rem;
			cursor: pointer;

			input {
				accent-color: #ff4a1f;
			}
		}

		.reset {
			align-self: flex-start;
			padding: 0;
			font: inherit;
			font-size: 0.75rem;
			color: rgb(255 255 255 / 0.6);
			background: none;
			border: 0;
			text-decoration: underline;
			cursor: pointer;

			&:hover {
				color: #fff;
			}
		}
	`,
	host: {
		'(document:keydown.escape)': 'open.set(false)',
	},
})
export class PlayerSettingsMenuComponent {
	protected readonly player = inject(PlayerStore);
	protected readonly open = signal(false);

	protected readonly settings = this.player.settings;
	protected readonly contextLabel = computed(
		() =>
			PLAYER_CONTEXT_LABELS[
				this.player.shown().request?.context ?? 'default'
			]
	);

	protected readonly sources: Choice<PlayerSourceSetting>[] = [
		{ value: 'auto', label: 'Auto' },
		{ value: 'spotify', label: 'Spotify' },
		{ value: 'youtube', label: 'YouTube' },
	];
	protected readonly views: Choice<PlayerView>[] = [
		{ value: 'panel', label: 'Page' },
		{ value: 'stage', label: 'Full screen' },
	];
	protected readonly backdrops: Choice<PlayerBackdrop>[] = [
		{ value: 'cover', label: 'Cover' },
		{ value: 'scene', label: 'Animated world' },
	];
	protected readonly effects: Choice<PlayerEffects>[] = [
		{ value: 'off', label: 'Off' },
		{ value: 'subtle', label: 'Subtle' },
		{ value: 'full', label: 'Full' },
	];

	protected sourceAvailable(source: PlayerSourceSetting): boolean {
		return source === 'auto' || this.player.available()[source];
	}

	protected selectDevice(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;
		void this.player.selectDevice(value || null);
	}

	protected set(changes: Partial<PlayerSettings>): void {
		this.player.updateSettings(changes);
	}
}
