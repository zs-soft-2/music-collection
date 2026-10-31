import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { GENRE_SCOPE_LIMIT, GenreEntity } from '@music-collection/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/**
 * What a collector who follows no genre yet is greeted with, in place of
 * the home page.
 *
 * The showcase behind it is a guest's: a few collections of every genre,
 * which tells somebody looking around what there is, and is noise to
 * somebody who came for one of them. So the page asks first, and shows
 * nothing it would have to take back. The ticks are only the form's until
 * the collector presses the button — the choice rebuilds the local catalog
 * and starts the app again on it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-genre-choice',
	imports: [...I18N_IMPORTS],
	template: `
		<ng-container *transloco="let t">
			<section class="choice" aria-labelledby="genre-choice-title">
				<h2 id="genre-choice-title">
					{{ t('ui.genreChoice.title') }}
				</h2>
				<p>{{ t('ui.genreChoice.pitch', { limit: limit }) }}</p>

				<fieldset>
					<legend class="visually-hidden">
						{{ t('ui.profileGenres.legend', { limit: limit }) }}
					</legend>

					@for (genre of genres(); track genre.slug) {
						<button
							type="button"
							[class.selected]="draft().includes(genre.slug)"
							[attr.aria-pressed]="draft().includes(genre.slug)"
							[disabled]="full() && !draft().includes(genre.slug)"
							(click)="toggle(genre.slug)"
						>
							{{ genre.name }}
						</button>
					}
				</fieldset>

				<button
					type="button"
					class="primary"
					[disabled]="!draft().length || applying()"
					(click)="choose.emit(draft())"
				>
					@if (applying()) {
						{{ t('ui.profileGenres.applying') }}
					} @else {
						{{ t('ui.genreChoice.start') }}
					}
				</button>
			</section>
		</ng-container>
	`,
	styles: `
		:host {
			display: block;
			margin-top: 2rem;
		}

		.choice {
			display: grid;
			gap: 1.25rem;
			justify-items: start;
			padding: clamp(1.25rem, 3vw, 2rem);
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-lg);
		}

		h2 {
			margin: 0;
			font-family: var(--mc-font-display);
			font-size: clamp(1.6rem, 2.5vw, 2.1rem);
			font-weight: 400;
			line-height: 1.1;
			letter-spacing: 0.02em;
		}

		p {
			margin: 0;
			max-width: 46rem;
			font-size: 0.95rem;
			line-height: 1.5;
			color: var(--mc-text-muted);
		}

		fieldset {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin: 0;
			padding: 0;
			border: 0;
		}

		.visually-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}

		button {
			padding: 0.45rem 0.9rem;
			font: inherit;
			font-size: 0.875rem;
			color: var(--mc-text);
			background: transparent;
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
			cursor: pointer;

			&.selected {
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}

			&:disabled {
				opacity: 0.45;
				cursor: default;
			}

			&:focus-visible {
				outline: 2px solid var(--mc-text);
				outline-offset: 3px;
			}
		}

		.primary {
			padding: 0.7rem 1.25rem;
			font-weight: 600;
			color: var(--mc-on-primary);
			background: var(--mc-primary);
			border: 0;
			border-radius: var(--mc-radius-md);
		}
	`,
})
export class GenreChoiceComponent {
	public readonly limit = GENRE_SCOPE_LIMIT;

	/** The genres to pick from. */
	public readonly genres = input<GenreEntity[]>([]);
	/** The choice is being applied; the page is about to start again. */
	public readonly applying = input(false);

	public readonly choose = output<string[]>();

	protected readonly draft = signal<string[]>([]);
	protected readonly full = computed(
		() => this.draft().length >= GENRE_SCOPE_LIMIT
	);

	protected toggle(slug: string): void {
		const draft = this.draft();

		this.draft.set(
			draft.includes(slug)
				? draft.filter((chosen) => chosen !== slug)
				: [...draft, slug].slice(-GENRE_SCOPE_LIMIT)
		);
	}
}
