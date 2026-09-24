import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	PLAYER_CONTEXT_LABELS,
	PlayerContext,
	PlayerEffects,
	PlayerSettings,
	PlayerSourceSetting,
	PlayerView,
	resolvePlayerSettings,
} from '../../../../data/player';
import { PlayerStore } from '../../../../shared/player';

interface Choice<T> {
	value: T;
	labelKey: string;
}

/**
 * The player's settings, one block per kind of page. The gear button on the
 * player sets the page it is on; here all of them are in one place.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-playback',
	imports: [...I18N_IMPORTS],
	template: `
		@for (context of contexts; track context) {
			<article class="context">
				<header>
					<h3>On {{ labels[context] }}</h3>
					@if (overridden(context)) {
						<button
							type="button"
							class="reset"
							(click)="player.resetSettingsFor(context)"
						>
							{{
								'ui.profilePlayback.back-to-defaults'
									| transloco
							}}
						</button>
					}
				</header>

				<div class="choices">
					<fieldset>
						<legend>
							{{ 'ui.profilePlayback.play-on' | transloco }}
						</legend>
						@for (choice of sources; track choice.value) {
							<button
								type="button"
								[class.selected]="
									settings(context).source === choice.value
								"
								(click)="set(context, { source: choice.value })"
							>
								{{ choice.labelKey | transloco }}
							</button>
						}
					</fieldset>

					<fieldset>
						<legend>
							{{ 'ui.profilePlayback.opens' | transloco }}
						</legend>
						@for (choice of views; track choice.value) {
							<button
								type="button"
								[class.selected]="
									settings(context).view === choice.value
								"
								(click)="set(context, { view: choice.value })"
							>
								{{ choice.labelKey | transloco }}
							</button>
						}
					</fieldset>

					<fieldset>
						<legend>
							{{ 'ui.profilePlayback.visuals' | transloco }}
						</legend>
						@for (choice of effects; track choice.value) {
							<button
								type="button"
								[class.selected]="
									settings(context).effects === choice.value
								"
								(click)="
									set(context, { effects: choice.value })
								"
							>
								{{ choice.labelKey | transloco }}
							</button>
						}
					</fieldset>
				</div>

				<div class="switches">
					<label class="switch">
						<input
							type="checkbox"
							[checked]="settings(context).lyrics"
							(change)="
								set(context, {
									lyrics: !settings(context).lyrics,
								})
							"
						/>
						{{
							'ui.profilePlayback.show-the-lyrics-when'
								| transloco
						}}
					</label>

					<label class="switch">
						<input
							type="checkbox"
							[checked]="settings(context).autoAdvance"
							(change)="
								set(context, {
									autoAdvance: !settings(context).autoAdvance,
								})
							"
						/>
						{{ 'ui.profilePlayback.play-on-to-the' | transloco }}
					</label>
				</div>
			</article>
		}
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
		}

		.context {
			display: flex;
			flex-direction: column;
			gap: 0.9rem;
			padding-top: 1.25rem;
			border-top: 1px solid var(--mc-border);

			&:first-child {
				padding-top: 0;
				border-top: 0;
			}
		}

		header {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.5rem;
		}

		h3 {
			margin: 0;
			font-size: 1rem;
			font-weight: 600;
		}

		.reset {
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

		.choices {
			display: flex;
			flex-wrap: wrap;
			gap: 1.25rem;
		}

		fieldset {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;
			padding: 0;
			margin: 0;
			border: 0;
		}

		legend {
			padding: 0;
			margin-bottom: 0.4rem;
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.choices button {
			padding: 0.4rem 0.8rem;
			font: inherit;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
			background: var(--mc-surface-2);
			border: 1px solid transparent;
			border-radius: 999px;
			cursor: pointer;

			&:hover {
				color: var(--mc-text);
			}

			&.selected {
				color: var(--mc-text);
				border-color: var(--mc-primary);
			}
		}

		.switches {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.switch {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.875rem;
			color: var(--mc-text-muted);
			cursor: pointer;

			input {
				accent-color: var(--mc-primary);
			}
		}
	`,
})
export class ProfilePlaybackComponent {
	protected readonly player = inject(PlayerStore);

	protected readonly labels = PLAYER_CONTEXT_LABELS;
	protected readonly contexts = Object.keys(
		PLAYER_CONTEXT_LABELS
	) as PlayerContext[];

	protected readonly sources: Choice<PlayerSourceSetting>[] = [
		{ value: 'auto', labelKey: 'ui.playback.auto' },
		{ value: 'spotify', labelKey: 'ui.playback.spotify' },
		{ value: 'youtube', labelKey: 'ui.playback.youtube' },
	];
	protected readonly views: Choice<PlayerView>[] = [
		{ value: 'panel', labelKey: 'ui.playback.page' },
		{ value: 'stage', labelKey: 'ui.playback.fullScreen' },
	];
	protected readonly effects: Choice<PlayerEffects>[] = [
		{ value: 'off', labelKey: 'ui.playback.off' },
		{ value: 'subtle', labelKey: 'ui.playback.subtle' },
		{ value: 'full', labelKey: 'ui.playback.full' },
	];

	protected settings(context: PlayerContext): PlayerSettings {
		return resolvePlayerSettings(context, this.player.overrides());
	}

	/** Whether this kind of page has been set apart from the defaults. */
	protected overridden(context: PlayerContext): boolean {
		return !!this.player.overrides()[context];
	}

	protected set(
		context: PlayerContext,
		changes: Partial<PlayerSettings>
	): void {
		this.player.updateSettingsFor(context, changes);
	}
}
