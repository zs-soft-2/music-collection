import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	BadgeContextLevel,
	BadgeQualityProfile,
} from '@music-collection/domain/music-collection/api';

import { AiMarkComponent } from '../../../shared/music-ui';

import { BadgeSettingsStore } from './badge-settings.store';

/**
 * The gateway's price brackets, cheapest first. The list lives here rather
 * than in the api barrel: this page is lazy, and a value exported from
 * there would travel in the main bundle for everyone.
 */
const BRACKETS: readonly BadgeQualityProfile[] = [
	'economy',
	'normal',
	'premium',
];

/**
 * How much of the collection reaches the model, narrowest first.
 *
 * Its own setting, not a side effect of the bracket. The bracket says what
 * an image may cost; this says what the prompt is built from. They cross
 * freely — a cheap model can draw from the real records, an expensive one
 * can draw blind — and the gateway assigns no image model to `premium`
 * today, so hanging the context off the bracket would put the widest level
 * out of reach for a reason that has nothing to do with it.
 */
const LEVELS: readonly BadgeContextLevel[] = ['catalog', 'rich', 'ai'];

/**
 * Admin: the badge generation settings. Everything here costs money when a
 * badge is drawn, which is why the day has a ceiling and why generation can
 * be switched off outright.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-badge-settings',
	providers: [BadgeSettingsStore],
	imports: [...I18N_IMPORTS, AiMarkComponent],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>
					{{ 'ui.badgeSettings.badge-generation' | transloco }}
					<mc-ai-mark
						[hint]="'ui.aiMark.hint.image' | transloco"
					></mc-ai-mark>
				</h1>
				<p>
					{{ 'ui.badgeSettings.a-collection-s-badge' | transloco }}
				</p>
			</div>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">{{
					'ui.badgeSettings.loading' | transloco
				}}</span>
			</div>
		} @else {
			@let settings = store.settings();

			<div class="mc-form">
				<section class="mc-form-section">
					<h2>{{ 'ui.badgeSettings.the-model' | transloco }}</h2>

					<div class="mc-form-grid">
						<div class="mc-field is-wide">
							<label class="switch">
								<input
									type="checkbox"
									[checked]="settings.enabled"
									(change)="
										store.set({ enabled: checked($event) })
									"
								/>
								<span>{{
									'ui.badgeSettings.generation-is-on'
										| transloco
								}}</span>
							</label>
							<small>
								{{
									'ui.badgeSettings.switched-off-no-badge'
										| transloco
								}}
							</small>
						</div>

						<div class="mc-field">
							<label for="bracket">{{
								'ui.badgeSettings.price-bracket' | transloco
							}}</label>
							<select
								id="bracket"
								(change)="
									store.set({
										qualityProfile: bracket($event),
									})
								"
							>
								@for (name of brackets; track name) {
									<option
										[value]="name"
										[selected]="
											name === settings.qualityProfile
										"
									>
										{{
											'ui.badgeSettings.bracket-' + name
												| transloco
										}}
									</option>
								}
							</select>
							<small>
								{{
									'ui.badgeSettings.the-bracket-decides-the-model'
										| transloco
								}}
							</small>
						</div>

						<div class="mc-field">
							<label for="context">{{
								'ui.badgeSettings.what-the-badge-knows'
									| transloco
							}}</label>
							<select
								id="context"
								(change)="
									store.set({ contextLevel: level($event) })
								"
							>
								@for (name of levels; track name) {
									<option
										[value]="name"
										[selected]="
											name === settings.contextLevel
										"
									>
										{{
											'ui.badgeSettings.level-' + name
												| transloco
										}}
									</option>
								}
							</select>
							<small>
								{{
									'ui.badgeSettings.level-' +
										settings.contextLevel +
										'-explained' | transloco
								}}
							</small>
						</div>

						<div class="mc-field is-wide">
							<small>
								{{
									'ui.badgeSettings.the-gateway-picks'
										| transloco
								}}
							</small>
						</div>
					</div>
				</section>

				<section class="mc-form-section">
					<h2>
						{{ 'ui.badgeSettings.what-a-badge-costs' | transloco }}
					</h2>

					<div class="mc-form-grid">
						<div class="mc-field">
							<label for="candidates">{{
								'ui.badgeSettings.candidates-per-run'
									| transloco
							}}</label>
							<input
								id="candidates"
								type="number"
								min="1"
								max="8"
								[value]="settings.candidateCount"
								(input)="
									store.setNumber(
										'candidateCount',
										value($event)
									)
								"
							/>
							<small>
								{{
									'ui.badgeSettings.how-many-the-admin'
										| transloco
								}}
							</small>
						</div>

						<div class="mc-field">
							<label for="daily">{{
								'ui.badgeSettings.images-per-day' | transloco
							}}</label>
							<input
								id="daily"
								type="number"
								min="1"
								max="2000"
								[value]="settings.dailyImageLimit"
								(input)="
									store.setNumber(
										'dailyImageLimit',
										value($event)
									)
								"
							/>
							<small>
								{{
									'ui.badgeSettings.the-ceiling-for-the'
										| transloco
								}}
							</small>
						</div>
					</div>
				</section>

				<section class="mc-form-section locked">
					<h2>
						{{ 'ui.badgeSettings.what-cannot-be-set' | transloco }}
					</h2>
					<p>
						{{ 'ui.badgeSettings.the-style-lock-the' | transloco }}
					</p>
				</section>

				<div class="mc-form-actions">
					<button
						type="button"
						class="primary"
						[disabled]="!store.canSave()"
						(click)="store.save()"
					>
						{{ store.isSaving() ? 'Saving…' : 'Save' }}
					</button>
					@if (store.savedAt()) {
						<span class="saved" role="status">{{
							'ui.badgeSettings.saved' | transloco
						}}</span>
					}
				</div>
			</div>
		}
	`,
	styles: `
		.switch {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
		}

		.locked p {
			margin: 0;
			max-width: 60ch;
			color: var(--mc-text-muted);
			line-height: 1.6;
		}

		.mc-form-actions {
			display: flex;
			align-items: center;
			gap: 1rem;
		}

		.saved {
			color: var(--mc-status-ok);
			font-size: 0.85rem;
		}
	`,
})
export class BadgeSettingsComponent {
	protected readonly store = inject(BadgeSettingsStore);
	protected readonly brackets = BRACKETS;
	protected readonly levels = LEVELS;

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	protected checked(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}

	protected bracket(event: Event): BadgeQualityProfile {
		return (event.target as HTMLSelectElement).value as BadgeQualityProfile;
	}

	protected level(event: Event): BadgeContextLevel {
		return (event.target as HTMLSelectElement).value as BadgeContextLevel;
	}
}
