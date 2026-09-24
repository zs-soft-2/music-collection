import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/** One step of the trail. Without a `link` it is the page we are on. */
export interface Crumb {
	label: string;
	link?: string | unknown[];
	/** Kept on the link, so a step up is read where this page was read. */
	queryParams?: Record<string, string>;
}

/**
 * The trail of a detail page: where this page sits in the app, one link per
 * step up. Unlike a "Back" link it always leads where it says it does — the
 * browser's own back button is what returns to wherever you came from.
 *
 * The last crumb is the page itself, so a trail may be given while the page
 * is still loading: the steps up are there from the first paint, and the name
 * of the page joins them once it is known.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-page-breadcrumb',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		<nav [attr.aria-label]="'ui.pageBreadcrumb.breadcrumb' | transloco">
			<ol>
				@for (crumb of trail(); track crumb.label; let last = $last) {
					<li>
						@if (crumb.link && !last) {
							<a
								[routerLink]="crumb.link"
								[queryParams]="crumb.queryParams ?? null"
								>{{ crumb.label }}</a
							>
						} @else {
							<span [attr.aria-current]="last ? 'page' : null">{{
								crumb.label
							}}</span>
						}
						@if (!last) {
							<i class="pi pi-angle-right" aria-hidden="true"></i>
						}
					</li>
				}
			</ol>
		</nav>
	`,
	styles: `
		:host {
			display: block;
			margin-bottom: 0.75rem;
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

		.pi {
			font-size: 0.6875rem;
			color: var(--mc-text-muted);
			opacity: 0.6;
		}
	`,
})
export class PageBreadcrumbComponent {
	public readonly trail = input.required<readonly Crumb[]>();
}
