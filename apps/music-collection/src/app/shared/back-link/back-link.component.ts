import { Location } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/**
 * "Back" link of a detail page: returns to the previous page of the app, or
 * to `fallback` when the page was opened directly (e.g. from a shared link).
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-back-link',
	imports: [RouterLink],
	template: `
		<a class="back" [routerLink]="fallback()" (click)="back($event)">
			<i class="pi pi-arrow-left" aria-hidden="true"></i>
			<span>{{ label() }}</span>
		</a>
	`,
	styles: `
		:host {
			display: block;
			margin-bottom: 0.75rem;
		}

		.back {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.25rem 0;
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--mc-text-muted);
			text-decoration: none;
			transition: color var(--mc-duration-fast) ease;

			&:hover {
				color: var(--mc-text);
			}

			.pi {
				font-size: 0.75rem;
				transition: transform var(--mc-duration-fast) ease;
			}

			&:hover .pi {
				transform: translateX(-3px);
			}
		}
	`,
})
export class BackLinkComponent {
	/** Where to go when there is no previous page in the app. */
	public readonly fallback = input.required<string | unknown[]>();
	public readonly label = input('Back');

	private readonly router = inject(Router);
	private readonly location = inject(Location);

	protected back(event: MouseEvent): void {
		// Modified clicks open the fallback in a new tab as usual.
		if (
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey
		) {
			return;
		}
		if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
			event.preventDefault();
			this.location.back();
		}
	}
}
