import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { Crumb } from '../page-breadcrumb/crumb';

import { NavigationHistoryService } from './navigation-history.service';

/**
 * One step back out of this page — to the page the reader came from.
 *
 * It is deliberately not the breadcrumb. The breadcrumb next to it says where
 * the page sits and always leads to the same places; this leads wherever the
 * reader was a moment ago, which is usually somewhere else entirely — the
 * front page's spotlight, a collection, a search, another band's lineup.
 *
 * On a page opened from a link somebody sent there is no "a moment ago", so
 * the control falls back on the page's own parent rather than walking the
 * reader out of the app. It is hidden only when there is neither.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-page-back',
	imports: [...I18N_IMPORTS],
	template: `
		@if (shown()) {
			<button
				type="button"
				class="back"
				[attr.aria-label]="ariaLabel()"
				(click)="go()"
			>
				<i class="pi pi-arrow-left" aria-hidden="true"></i>
				<span>{{ label() || ('ui.pageBack.back' | transloco) }}</span>
			</button>
		}
	`,
	styles: `
		/*
		 * No box of its own: the button stands in the breadcrumb's row as if
		 * it were a child of it, and nothing is left behind when it is not
		 * shown.
		 */
		:host {
			display: contents;
		}

		.back {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			height: 26px;
			box-sizing: border-box;
			padding: 0 0.625rem 0 0.5rem;
			border: 1px solid var(--mc-border);
			border-radius: 9999px;
			background: transparent;
			color: var(--mc-text-muted);
			font: inherit;
			font-size: 0.8125rem;
			font-weight: 600;
			white-space: nowrap;
			cursor: pointer;
			transition:
				color var(--mc-duration-fast) ease,
				border-color var(--mc-duration-fast) ease;

			&:hover {
				border-color: var(--mc-border-strong);
				color: var(--mc-text);
			}
		}

		.pi {
			font-size: 0.6875rem;
		}
	`,
})
export class PageBackComponent {
	private readonly history = inject(NavigationHistoryService);
	private readonly router = inject(Router);

	/** Where to go when this page was opened on its own. */
	public readonly fallback = input<Crumb | null>(null);
	/** What to call the step back, when the page knows something better. */
	public readonly label = input<string | null>(null);

	protected readonly shown = computed(
		() => this.history.canGoBack() || !!this.fallback()?.link
	);

	protected readonly ariaLabel = computed(() => this.label() || null);

	protected go(): void {
		if (this.history.back()) {
			return;
		}

		const crumb = this.fallback();
		const link = crumb?.link ?? '/home';

		void this.router.navigate(
			typeof link === 'string' ? [link] : [...link],
			{ queryParams: crumb?.queryParams }
		);
	}
}
