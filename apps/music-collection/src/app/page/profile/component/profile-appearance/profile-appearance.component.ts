import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { LayoutWidthService, ThemeMode, ThemeService } from '../../../../theme';

/**
 * The look of the app. The same switches sit in the top bar; here they are
 * spelled out, and — like everything on this page — they are kept for the
 * account, so a second machine opens the way the first one was left.
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
