import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

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
	template: `
		<header class="mc-page-head">
			<div>
				<h1>Badge generation</h1>
				<p>
					A collection's badge is drawn once by an image model, from
					the collection's own data, and then it is fixed.
				</p>
			</div>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">Loading…</span>
			</div>
		} @else {
			@let settings = store.settings();

			<div class="mc-form">
				<section class="mc-form-section">
					<h2>The model</h2>

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
								<span>Generation is on</span>
							</label>
							<small>
								Switched off, no badge can be drawn and nothing
								can be spent.
							</small>
						</div>

						<div class="mc-field">
							<label for="model">Model</label>
							<input
								id="model"
								type="text"
								[value]="settings.model"
								(input)="store.set({ model: value($event) })"
							/>
							<small>
								An Imagen model id, as the Vertex publisher path
								spells it. Media Studio lists the ones this
								project can reach.
							</small>
						</div>

						<div class="mc-field">
							<label for="location">Region</label>
							<input
								id="location"
								type="text"
								[value]="settings.location"
								(input)="store.set({ location: value($event) })"
							/>
							<small>
								The Vertex region — not necessarily the one the
								database is in.
							</small>
						</div>
					</div>
				</section>

				<section class="mc-form-section">
					<h2>What a badge costs</h2>

					<div class="mc-form-grid">
						<div class="mc-field">
							<label for="candidates">Candidates per run</label>
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
								How many the admin picks between. More costs
								more, and every one of them is billed.
							</small>
						</div>

						<div class="mc-field">
							<label for="daily">Images per day</label>
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
								The ceiling for the whole day, counted on the
								server. A loop that goes wrong stops here
								instead of on the invoice.
							</small>
						</div>
					</div>
				</section>

				<section class="mc-form-section locked">
					<h2>What cannot be set here</h2>
					<p>
						The style lock — the fixed sentences every badge is
						drawn from — and the style version live in code. They
						are the only reason a shelf of badges reads as one set:
						if a curator could edit them per badge, the set would
						drift apart within weeks. Changing them is a deliberate
						act, and it means regenerating every badge.
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
						<span class="saved" role="status">Saved.</span>
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
