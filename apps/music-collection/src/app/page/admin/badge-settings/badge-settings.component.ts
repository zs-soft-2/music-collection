import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { BadgeSettingsStore } from './badge-settings.store';

/**
 * Admin: the badge generation settings. Everything here costs money when a
 * badge is drawn, which is why the day has a ceiling and why generation can
 * be switched off outright.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-badge-settings',
	providers: [BadgeSettingsStore],
	imports: [...I18N_IMPORTS],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'ui.badgeSettings.badge-generation' | transloco }}</h1>
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
							<label for="model">{{
								'ui.badgeSettings.model' | transloco
							}}</label>
							<select
								id="model"
								[value]="settings.model"
								[disabled]="store.isLoadingModels()"
								(change)="store.set({ model: value($event) })"
							>
								@for (
									model of store.modelOptions();
									track model.name
								) {
									<option
										[value]="model.name"
										[selected]="
											model.name === settings.model
										"
									>
										{{ model.name }}
										{{
											model.isReachable
												? ''
												: '— not available here'
										}}
									</option>
								}
							</select>
							<small>
								@if (store.isLoadingModels()) {
									Reading the region's catalogue…
								} @else if (store.modelsError(); as error) {
									The catalogue could not be read ({{
										error
									}}). The saved model is kept.
								} @else {
									What this project can actually call in the
									region below, read from Vertex when the page
									opened — not a list kept in our code. One
									marked as unavailable will fail with a 404.
								}
							</small>
						</div>

						<div class="mc-field">
							<label for="location">{{
								'ui.badgeSettings.region' | transloco
							}}</label>
							<input
								id="location"
								type="text"
								[value]="settings.location"
								(input)="store.set({ location: value($event) })"
							/>
							<small>
								{{
									'ui.badgeSettings.the-vertex-region-not'
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

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	protected checked(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}
}
