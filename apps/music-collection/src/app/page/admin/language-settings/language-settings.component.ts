import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
	I18N_IMPORTS,
	LANGUAGE_ENDONYMS,
	LanguageEnum,
	LanguageList,
} from '@music-collection/core/i18n';

import { LanguageSettingsStore } from './language-settings.store';

/**
 * Admin: which language the app opens in.
 *
 * It reaches only the readers who have not picked one — a visitor whose
 * browser asks for a language nobody here speaks, or a collector who has
 * never been to the switch. Anyone who has chosen keeps their choice, which
 * is why setting this does not change what the administrator sees either.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-language-settings',
	providers: [LanguageSettingsStore],
	imports: [...I18N_IMPORTS],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'admin.language.title' | transloco }}</h1>
				<p>{{ 'admin.language.intro' | transloco }}</p>
			</div>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">{{
					'common.loading' | transloco
				}}</span>
			</div>
		} @else {
			<div class="mc-form">
				<section class="mc-form-section">
					<h2>{{ 'admin.language.heading' | transloco }}</h2>

					<div class="choices" role="radiogroup">
						@for (option of languages; track option) {
							<button
								type="button"
								role="radio"
								class="choice"
								[class.selected]="store.language() === option"
								[attr.aria-checked]="
									store.language() === option
								"
								[disabled]="store.isSaving()"
								(click)="pick(option)"
							>
								<span class="tag">{{ option }}</span>
								{{ endonyms[option] }}
							</button>
						}
					</div>

					<p class="hint">
						@if (store.language()) {
							{{ 'admin.language.hint' | transloco }}
						} @else {
							{{ 'admin.language.unset' | transloco }}
						}
					</p>

					@if (store.savedAt()) {
						<p class="saved" role="status">
							{{ 'admin.language.saved' | transloco }}
						</p>
					}
				</section>
			</div>
		}
	`,
	styles: `
		.choices {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.choice {
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

			&:hover:not(:disabled) {
				background: var(--mc-surface-2);
			}

			&.selected {
				border-color: var(--mc-primary);
				font-weight: 600;
			}

			&:disabled {
				opacity: 0.6;
				cursor: default;
			}
		}

		.tag {
			color: var(--mc-text-muted);
			font-size: 0.6875rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		.hint,
		.saved {
			margin: 0.75rem 0 0;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		.error {
			color: var(--mc-danger, crimson);
		}
	`,
})
export class LanguageSettingsComponent {
	protected readonly store = inject(LanguageSettingsStore);
	protected readonly languages = LanguageList;
	protected readonly endonyms = LANGUAGE_ENDONYMS;

	protected pick(language: LanguageEnum): void {
		if (language !== this.store.language()) {
			this.store.save(language);
		}
	}
}
