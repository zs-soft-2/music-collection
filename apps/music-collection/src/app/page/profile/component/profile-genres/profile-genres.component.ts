import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GENRE_SCOPE_LIMIT } from '@music-collection/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ProfilePageStore } from '../../profile-page.store';

/**
 * Which genres the collector is here for, and with that how much catalog
 * their browser downloads at all.
 *
 * It reads as a taste — "what am I interested in?" — and it is one, but it
 * is also the heaviest setting on this page: each genre is a bundle, and
 * following two instead of everything is the difference between a slice of
 * the catalog and all of it. So the page says what the choice costs, offers
 * the whole catalog as a plain option rather than an escape hatch, and does
 * nothing at all until the collector presses apply — the change throws away
 * what this browser holds and starts the app again on the new scope.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-genres',
	imports: [...I18N_IMPORTS],
	template: `
		<ng-container *transloco="let t">
			<fieldset>
				<legend>
					{{ t('ui.profileGenres.legend', { limit: limit }) }}
				</legend>

				<button
					type="button"
					[class.selected]="!store.genreDraft().length"
					[attr.aria-pressed]="!store.genreDraft().length"
					(click)="store.clearGenreDraft()"
				>
					<i class="pi pi-globe" aria-hidden="true"></i>
					{{ t('ui.profileGenres.all') }}
				</button>

				@for (genre of store.genres(); track genre.slug) {
					<button
						type="button"
						[class.selected]="
							store.genreDraft().includes(genre.slug)
						"
						[attr.aria-pressed]="
							store.genreDraft().includes(genre.slug)
						"
						[disabled]="
							store.genreScopeFull() &&
							!store.genreDraft().includes(genre.slug)
						"
						(click)="store.toggleGenre(genre.slug)"
					>
						{{ genre.name }}
					</button>
				}
			</fieldset>

			<p class="note">
				@if (store.genreScope().length) {
					{{ t('ui.profileGenres.following') }}
				} @else {
					{{ t('ui.profileGenres.everything') }}
				}
			</p>

			@if (store.genreScopeChanged()) {
				<div class="apply">
					<p class="warning">
						<i
							class="pi pi-exclamation-circle"
							aria-hidden="true"
						></i>
						{{ t('ui.profileGenres.rebuild') }}
					</p>

					<button
						type="button"
						class="primary"
						[disabled]="store.genreScopeApplying()"
						(click)="store.applyGenreScope()"
					>
						@if (store.genreScopeApplying()) {
							{{ t('ui.profileGenres.applying') }}
						} @else {
							{{ t('ui.profileGenres.apply') }}
						}
					</button>
				</div>
			}
		</ng-container>
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
			gap: 0.5rem;
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
				opacity: 0.45;
				cursor: not-allowed;
			}

			&.primary {
				border-color: var(--mc-primary);
				background: var(--mc-primary);
				color: var(--mc-on-primary, #fff);
				font-weight: 600;
			}
		}

		.note {
			margin: 0.75rem 0 0;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		.apply {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
			margin-top: 1rem;
			padding-top: 1rem;
			border-top: 1px solid var(--mc-border);
		}

		.warning {
			flex: 1 1 16rem;
			margin: 0;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}
	`,
})
export class ProfileGenresComponent {
	protected readonly store = inject(ProfilePageStore);
	protected readonly limit = GENRE_SCOPE_LIMIT;
}
