import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Query parameter of the page to return to after an admin edit. */
export const RETURN_URL_PARAM = 'returnUrl';

/**
 * Round trip from a public page to an admin editor and back: the page passes
 * its URL in `returnUrl`, and the editor returns there when it is closed.
 */
@Injectable({ providedIn: 'root' })
export class ReturnNavigationService {
	private readonly router = inject(Router);

	/** The page to return to, if the current URL carries a safe one. */
	public returnUrl(): string | null {
		const value = this.router.parseUrl(this.router.url).queryParams[
			RETURN_URL_PARAM
		];

		// Only in-app paths: no protocol-relative or external targets.
		return typeof value === 'string' &&
			value.startsWith('/') &&
			!value.startsWith('//') &&
			!value.startsWith('/admin')
			? value
			: null;
	}

	/** Returns to the calling page, or goes to the fallback route. */
	public leave(fallback: unknown[], relativeTo: ActivatedRoute): void {
		const returnUrl = this.returnUrl();

		if (returnUrl) {
			this.router.navigateByUrl(returnUrl);
		} else {
			this.router.navigate(fallback, { relativeTo });
		}
	}
}
