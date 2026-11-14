import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	output,
	signal,
} from '@angular/core';
import { ReleaseEntity } from '@music-collection/api';
import { RARITY_TIERS, RarityTier } from '@music-collection/common/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { RarityOverrideChange } from '../../release-page.store';

/**
 * Where a curator sets a pressing's tier by hand, or takes that back.
 *
 * The count Discogs gives is of its own users, not of the world, and a
 * pressing with no Discogs page has only its tags to go by. Someone who has
 * held the record can know better — and has to say why, so the next curator
 * can tell a decision from a slip.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-rarity-admin',
	imports: [...I18N_IMPORTS],
	template: `
		<section aria-labelledby="rarity-admin-title">
			<h2 id="rarity-admin-title">
				{{ 'ui.rarityAdmin.title' | transloco }}
			</h2>
			<p class="lead">{{ 'ui.rarityAdmin.lead' | transloco }}</p>

			<form (submit)="save($event)">
				<div class="mc-field">
					<label for="rarity-tier">{{
						'ui.rarityAdmin.tier' | transloco
					}}</label>
					<select
						id="rarity-tier"
						[value]="tier()"
						(change)="tier.set(value($event))"
					>
						@for (option of tiers; track option) {
							<option
								[value]="option"
								[selected]="tier() === option"
							>
								{{
									'ui.collectionScore.rarity.' + option
										| transloco
								}}
							</option>
						}
					</select>
				</div>

				<div class="mc-field">
					<label for="rarity-note">{{
						'ui.rarityAdmin.note' | transloco
					}}</label>
					<textarea
						id="rarity-note"
						rows="2"
						maxlength="500"
						[value]="note()"
						(input)="note.set(value($event))"
					></textarea>
				</div>

				<div class="actions">
					<button
						type="submit"
						class="button is-primary"
						[disabled]="!canSave()"
					>
						{{ 'ui.rarityAdmin.save' | transloco }}
					</button>
					@if (release().rarityOverride) {
						<button
							type="button"
							class="button"
							[disabled]="saving()"
							(click)="override.emit({ tier: null, note: '' })"
						>
							{{ 'ui.rarityAdmin.clear' | transloco }}
						</button>
					}
					<button
						type="button"
						class="button"
						[disabled]="saving()"
						(click)="refresh.emit()"
					>
						{{ 'ui.rarityAdmin.refresh' | transloco }}
					</button>
				</div>
			</form>

			@if (error(); as message) {
				<p class="error" role="alert">{{ message }}</p>
			}
		</section>
	`,
	styles: `
		:host {
			display: block;
			padding: 1.1rem 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);
		}

		h2 {
			margin: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.lead {
			margin: 0.45rem 0 0.9rem;
			max-width: 65ch;
			font-size: 0.8rem;
			line-height: 1.4;
			color: var(--mc-text-muted);
		}

		form {
			display: grid;
			gap: 0.8rem;
			max-width: 32rem;
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.error {
			margin: 0.8rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-status-bad);
		}
	`,
})
export class ReleaseRarityAdminComponent {
	public readonly release = input.required<ReleaseEntity>();
	public readonly saving = input(false);
	public readonly error = input<string | null>(null);

	public readonly override = output<RarityOverrideChange>();
	public readonly refresh = output<void>();

	protected readonly tiers = RARITY_TIERS;
	protected readonly tier = signal<RarityTier>('common');
	protected readonly note = signal('');

	/** A tier needs a reason, and one change is sent at a time. */
	protected readonly canSave = computed(
		() => !this.saving() && !!this.note().trim()
	);

	public constructor() {
		// The form starts from what holds now: the curator's own tier where
		// there is one, the worked-out tier where there is not.
		effect(() => {
			const release = this.release();

			this.tier.set(
				release.rarityOverride?.tier ?? release.rarity?.tier ?? 'common'
			);
			this.note.set(release.rarityOverride?.note ?? '');
		});
	}

	protected value<T extends string>(event: Event): T {
		return (event.target as HTMLSelectElement | HTMLTextAreaElement)
			.value as T;
	}

	protected save(event: Event): void {
		event.preventDefault();

		if (this.canSave()) {
			this.override.emit({
				tier: this.tier(),
				note: this.note().trim(),
			});
		}
	}
}
