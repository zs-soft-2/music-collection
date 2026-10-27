import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { PageBackComponent } from '../page-back/page-back.component';

import { Crumb, parentCrumb } from './crumb';

/**
 * Where this page sits in the app, one link per step up, with a Back control
 * in front of it.
 *
 * The two say different things on purpose. The trail is the page's own
 * address in words: it leads to the pages that contain this one, it is the
 * same for every reader, and it always leads where it says it does. Back is
 * the reader's own last step, which no address can know — so a record opened
 * from a collection goes back to that collection, while its trail still
 * leads up through the band it is by.
 *
 * The last crumb is the page itself, so a trail may be given while the page
 * is still loading: the steps up are there from the first paint, and the name
 * of the page joins them once it is known.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-page-breadcrumb',
	imports: [...I18N_IMPORTS, PageBackComponent, RouterLink],
	template: `
		<div class="row">
			<mc-page-back [fallback]="parent()" [label]="backLabel()" />

			<nav [attr.aria-label]="'ui.pageBreadcrumb.breadcrumb' | transloco">
				<ol>
					@for (
						crumb of trail();
						track crumb.label;
						let last = $last
					) {
						<li>
							@if (crumb.link && !last) {
								<a
									[routerLink]="crumb.link"
									[queryParams]="crumb.queryParams ?? null"
									>{{ crumb.label }}</a
								>
							} @else {
								<span
									[attr.aria-current]="last ? 'page' : null"
									>{{ crumb.label }}</span
								>
							}
							@if (!last) {
								<i
									class="pi pi-angle-right separator"
									aria-hidden="true"
								></i>
							}
						</li>
					}
				</ol>
			</nav>
		</div>
	`,
	styles: `
		:host {
			display: block;
			margin-bottom: 0.75rem;
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.625rem;
			min-width: 0;
		}

		ol {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.375rem;
			margin: 0;
			padding: 0;
			list-style: none;
			font-size: 0.8125rem;
			font-weight: 600;
		}

		li {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			min-width: 0;
		}

		a {
			color: var(--mc-text-muted);
			text-decoration: none;
			transition: color var(--mc-duration-fast) ease;

			&:hover {
				color: var(--mc-text);
			}
		}

		span {
			color: var(--mc-text);
		}

		.separator {
			font-size: 0.6875rem;
			color: var(--mc-text-muted);
			opacity: 0.6;
		}
	`,
})
export class PageBreadcrumbComponent {
	public readonly trail = input.required<readonly Crumb[]>();
	/**
	 * What to call the step back where the page knows better than "Back" —
	 * the collection a record was opened from, say.
	 */
	public readonly backLabel = input<string | null>(null);

	protected readonly parent = computed(() => parentCrumb(this.trail()));
}
