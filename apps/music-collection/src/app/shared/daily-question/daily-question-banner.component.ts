import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	DAILY_QUESTION_PATH,
	DailyQuestionBannerStore,
} from './daily-question-banner.store';

/**
 * A line under the top bar while today's question is still unanswered.
 *
 * It sits where it can be read without being in the way, and it stays there:
 * a reminder that disappears on its own is a reminder that was missed. Three
 * things take it down — the guess, the close button, and midnight — and only
 * the middle one is the collector's to decide, which is why it is a button
 * and not a timer.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-daily-question-banner',
	providers: [DailyQuestionBannerStore],
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		@if (store.isVisible()) {
			<div class="banner" role="status">
				<p class="text">
					{{
						'ui.dailyQuestionBanner.there-is-a-question' | transloco
					}}
				</p>

				<a class="go" [routerLink]="path">
					{{ 'ui.dailyQuestionBanner.play-it' | transloco }}
				</a>

				<button
					type="button"
					class="close"
					[attr.aria-label]="
						'ui.dailyQuestionBanner.not-now' | transloco
					"
					(click)="store.dismiss()"
				>
					×
				</button>
			</div>
		}
	`,
	styles: `
		:host {
			position: sticky;
			/* Under the top bar, which is sticky at the very top. */
			top: var(--mc-app-bar-height);
			z-index: 90;
			display: block;
		}

		.banner {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem 1rem;
			padding: 0.6rem 1.5rem;
			border-bottom: 1px solid var(--mc-border);
			background: var(--mc-card-bg);
			backdrop-filter: blur(8px);
			font-family: var(--mc-font-body);
			font-size: 0.9rem;
		}

		.text {
			flex: 1;
			min-width: 12rem;
			margin: 0;
			color: var(--mc-text);
		}

		.go {
			padding: 0.3rem 0.9rem;
			border: 1px solid var(--mc-primary);
			border-radius: 999px;
			color: var(--mc-primary);
			font-weight: 600;
			text-decoration: none;

			&:hover {
				background: var(--mc-primary);
				color: var(--mc-on-primary, var(--mc-card-bg));
			}
		}

		.close {
			padding: 0 0.4rem;
			border: 0;
			background: none;
			color: var(--mc-text-subtle);
			font-size: 1.25rem;
			line-height: 1;
			cursor: pointer;

			&:hover {
				color: var(--mc-text);
			}
		}

		@media (width <= 600px) {
			.banner {
				padding-inline: 1rem;
			}
		}
	`,
})
export class DailyQuestionBannerComponent {
	protected readonly store = inject(DailyQuestionBannerStore);
	protected readonly path = DAILY_QUESTION_PATH;
}
