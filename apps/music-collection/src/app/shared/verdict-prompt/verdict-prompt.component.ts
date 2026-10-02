import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { StarRatingComponent } from '../music-ui';
import { VerdictPromptStore } from './verdict-prompt.store';

/**
 * "How was it?" — after a record has played right through, down in the
 * corner, where it can be answered in one tap or ignored altogether.
 *
 * Down there and not under the top bar on purpose: this question arrives
 * unasked, while the daily question's banner answers a collector who came to
 * play it. One star is the whole answer — no note, no form, no dialog over
 * the page — because the moment it takes to ask for more is the moment the
 * collector moves on.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-verdict-prompt',
	providers: [VerdictPromptStore],
	imports: [...I18N_IMPORTS, StarRatingComponent],
	template: `
		@if (store.asking(); as record) {
			<div class="prompt" role="status">
				<div class="text">
					<p class="question">
						{{ 'ui.verdictPrompt.how-was-it' | transloco }}
					</p>
					<p class="record">
						{{ record.albumTitle }}
						@if (record.artistName) {
							<span class="artist"
								>· {{ record.artistName }}</span
							>
						}
					</p>
				</div>

				<mc-star-rating
					[busy]="store.writing()"
					[clearable]="false"
					[label]="'ui.verdictPrompt.how-was-it' | transloco"
					(rated)="store.rate($event)"
				/>

				@if (store.failed()) {
					<p class="failed" role="alert">
						{{ 'ui.verdictPrompt.not-kept' | transloco }}
					</p>
				}

				<button
					type="button"
					class="close"
					[attr.aria-label]="'ui.verdictPrompt.not-now' | transloco"
					(click)="store.dismiss()"
				>
					×
				</button>
			</div>
		}
	`,
	styles: `
		:host {
			position: fixed;
			right: 1rem;
			bottom: 1rem;
			z-index: 80;
			display: block;
		}

		.prompt {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem 1rem;
			max-width: min(26rem, calc(100vw - 2rem));
			padding: 0.75rem 1rem;
			color: var(--mc-text);
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			box-shadow: var(--mc-shadow-menu);
		}

		.text {
			flex: 1 1 10rem;
		}

		.question {
			margin: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-primary);
		}

		.record {
			margin: 0.15rem 0 0;
			font-size: 0.9rem;
			font-weight: 600;
		}

		.artist {
			font-weight: 400;
			color: var(--mc-text-muted);
		}

		.failed {
			flex: 1 1 100%;
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-primary);
		}

		.close {
			padding: 0 0.4rem;
			font-size: 1.25rem;
			line-height: 1;
			color: var(--mc-text-subtle);
			background: none;
			border: 0;
			cursor: pointer;

			&:hover,
			&:focus-visible {
				color: var(--mc-text);
			}
		}

		@media (width <= 600px) {
			:host {
				right: 0.5rem;
				left: 0.5rem;
			}

			.prompt {
				max-width: none;
			}
		}
	`,
})
export class VerdictPromptComponent {
	protected readonly store = inject(VerdictPromptStore);
}
