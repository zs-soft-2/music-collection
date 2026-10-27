import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	COVER_ROTATION_CHOICES,
	COVER_TURNS,
	CoverMosaicService,
	NO_COVER_ROTATION,
} from '../../../../data/cover-mosaic';
import { LayoutWidthService, ThemeMode, ThemeService } from '../../../../theme';

/**
 * The look of the app: the theme and the page width, which also sit in the
 * top bar, and the pace of the collection mosaics, which is only here. Like
 * everything on this page they are kept for the account, so a second machine
 * opens the way the first one was left.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-appearance',
	imports: [...I18N_IMPORTS],
	template: `
		<fieldset>
			<legend>{{ 'ui.profileAppearance.theme' | transloco }}</legend>
			@for (choice of themes; track choice.value) {
				<button
					type="button"
					[class.selected]="theme.mode() === choice.value"
					[attr.aria-pressed]="theme.mode() === choice.value"
					(click)="theme.mode.set(choice.value)"
				>
					<i class="pi {{ choice.icon }}" aria-hidden="true"></i>
					{{ choice.labelKey | transloco }}
				</button>
			}
		</fieldset>

		<fieldset>
			<legend>{{ 'ui.profileAppearance.page-width' | transloco }}</legend>
			@for (choice of widths; track choice.wide) {
				<button
					type="button"
					[class.selected]="layoutWidth.isWide() === choice.wide"
					[attr.aria-pressed]="layoutWidth.isWide() === choice.wide"
					(click)="layoutWidth.isWide.set(choice.wide)"
				>
					<i class="pi {{ choice.icon }}" aria-hidden="true"></i>
					{{ choice.labelKey | transloco }}
				</button>
			}
		</fieldset>

		<p class="note">
			{{ 'ui.profileAppearance.the-wide-setting-only' | transloco }}
		</p>

		<fieldset>
			<legend>{{ 'ui.profileAppearance.mosaic' | transloco }}</legend>
			@for (choice of paces; track choice) {
				<button
					type="button"
					[class.selected]="mosaic.rotateSeconds() === choice"
					[attr.aria-pressed]="mosaic.rotateSeconds() === choice"
					(click)="mosaic.set({ rotateSeconds: choice })"
				>
					<i
						class="pi {{ choice ? 'pi-sync' : 'pi-pause' }}"
						aria-hidden="true"
					></i>
					@if (choice === still) {
						{{ 'ui.profileAppearance.mosaic-still' | transloco }}
					} @else {
						{{ choice }}
						{{ 'ui.profileAppearance.seconds-short' | transloco }}
					}
				</button>
			}
		</fieldset>

		<!--
			How it changes is only a question once it changes at all, so the
			movements are not offered to a mosaic that stands still.
		-->
		@if (mosaic.rotateSeconds() !== still) {
			<fieldset>
				<legend>
					{{ 'ui.profileAppearance.mosaic-turn' | transloco }}
				</legend>
				@for (choice of turns; track choice) {
					<button
						type="button"
						[class.selected]="mosaic.turn() === choice"
						[attr.aria-pressed]="mosaic.turn() === choice"
						(click)="mosaic.set({ turn: choice })"
					>
						{{ 'ui.profileAppearance.turn.' + choice | transloco }}
					</button>
				}
			</fieldset>
		}

		<p class="note">
			{{
				'ui.profileAppearance.a-collection-without-artwork' | transloco
			}}
		</p>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
		}

		fieldset {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			padding: 0;
			margin: 0;
			border: 0;
		}

		legend {
			padding: 0;
			margin-bottom: 0.5rem;
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		button {
			display: inline-flex;
			align-items: center;
			gap: 0.45rem;
			padding: 0.5rem 0.9rem;
			font: inherit;
			font-size: 0.875rem;
			color: var(--mc-text-muted);
			background: var(--mc-surface-2);
			border: 1px solid transparent;
			border-radius: 999px;
			cursor: pointer;
			transition: color var(--mc-duration-fast);

			&:hover {
				color: var(--mc-text);
			}

			&.selected {
				color: var(--mc-text);
				border-color: var(--mc-primary);
			}
		}

		.note {
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}
	`,
})
export class ProfileAppearanceComponent {
	protected readonly theme = inject(ThemeService);
	protected readonly layoutWidth = inject(LayoutWidthService);
	protected readonly mosaic = inject(CoverMosaicService);

	/** How often a collection's mosaic turns a cover over; the first stands. */
	protected readonly paces = COVER_ROTATION_CHOICES;
	protected readonly still = NO_COVER_ROTATION;
	/** What that turn looks like. */
	protected readonly turns = COVER_TURNS;

	protected readonly themes: {
		value: ThemeMode;
		labelKey: string;
		icon: string;
	}[] = [
		{
			value: 'dark',
			labelKey: 'ui.profileAppearance.dark',
			icon: 'pi-moon',
		},
		{
			value: 'light',
			labelKey: 'ui.profileAppearance.light',
			icon: 'pi-sun',
		},
	];

	protected readonly widths = [
		{
			wide: false,
			labelKey: 'ui.profileAppearance.standard',
			icon: 'pi-window-minimize',
		},
		{
			wide: true,
			labelKey: 'ui.profileAppearance.fullWidth',
			icon: 'pi-window-maximize',
		},
	];
}
