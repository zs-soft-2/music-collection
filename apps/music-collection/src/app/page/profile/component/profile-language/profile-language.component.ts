import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
	I18N_IMPORTS,
	LANGUAGE_ENDONYMS,
	LanguageEnum,
	LanguageList,
	LanguageService,
} from '@music-collection/core/i18n';

/**
 * The language, on the collector's own profile.
 *
 * The same switch as the one in the bar, and deliberately so — this is where
 * a reader goes looking for a setting they mean to keep, and picking it here
 * saves it to the account, so the next browser they sign in on opens in it.
 *
 * The languages name themselves, never translated: somebody who has landed in
 * a language they cannot read is looking for the word they *do* know, and
 * "Ungarisch" is no help to them.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-language',
	imports: [...I18N_IMPORTS],
	template: `
		<fieldset>
			<legend>{{ 'ui.profileLanguage.legend' | transloco }}</legend>
			@for (option of languages; track option) {
				<button
					type="button"
					[class.selected]="language.language() === option"
					[attr.aria-pressed]="language.language() === option"
					(click)="language.choose(option)"
				>
					<span class="tag">{{ option }}</span>
					{{ endonyms[option] }}
				</button>
			}
		</fieldset>

		<p class="note">
			@if (language.chosen()) {
				{{ 'ui.profileLanguage.chosen' | transloco }}
			} @else {
				{{ 'ui.profileLanguage.following' | transloco }}
			}
		</p>
	`,
	styles: `
		:host {
			display: block;
		}

		fieldset {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin: 0;
			padding: 0;
			border: 0;
		}

		legend {
			margin-bottom: 0.5rem;
			padding: 0;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		button {
			display: inline-flex;
			align-items: center;
			gap: 0.625rem;
			min-height: 44px;
			padding: 0 1rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			background: var(--mc-card-bg);
			color: var(--mc-text);
			font: inherit;
			cursor: pointer;

			&:hover {
				background: var(--mc-surface-2);
			}

			&.selected {
				border-color: var(--mc-primary);
				font-weight: 600;
			}
		}

		.tag {
			color: var(--mc-text-muted);
			font-size: 0.6875rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		.note {
			margin: 0.75rem 0 0;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}
	`,
})
export class ProfileLanguageComponent {
	protected readonly language = inject(LanguageService);
	protected readonly languages = LanguageList;
	protected readonly endonyms = LANGUAGE_ENDONYMS;
}
