import { ViewportScroller } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/** The address without the query and the fragment: the page it points at. */
function pathOf(url: string): string {
	return url.split(/[?#]/)[0];
}

/**
 * A page opens at its top.
 *
 * Angular leaves the scroll offset where it was, so walking off the bottom of
 * a long page lands the reader at the bottom of the next one — looking at the
 * footer, with everything the new page opens with somewhere above the window.
 *
 * `withInMemoryScrolling({ scrollPositionRestoration: 'top' })` would be the
 * one-line answer, but it counts every navigation, and several pages navigate
 * to themselves to write a control's state into the address: the profile's
 * tab strip, the network's depth and guests. Being torn to the top by the
 * control you just used is worse than the problem, so only a change of path —
 * a genuinely different page — scrolls.
 *
 * Back and forward are left alone: the browser knows where the reader was.
 */
@Injectable({ providedIn: 'root' })
export class PageScrollService {
	private readonly router = inject(Router);
	private readonly viewportScroller = inject(ViewportScroller);

	/** The page on screen, to tell a move apart from a change of query. */
	private path = pathOf(this.router.url);

	/** What started the navigation under way; a popstate is the browser's. */
	private trigger: NavigationStart['navigationTrigger'] = 'imperative';

	/**
	 * The navigation that draws the first screen. The document is at its top
	 * anyway, and after a reload the browser is busy putting the reader back
	 * where they were — which is not ours to undo.
	 */
	private first = true;

	public constructor() {
		this.router.events
			.pipe(
				filter(
					(event): event is NavigationStart | NavigationEnd =>
						event instanceof NavigationStart ||
						event instanceof NavigationEnd
				),
				takeUntilDestroyed()
			)
			.subscribe((event) => {
				if (event instanceof NavigationStart) {
					this.trigger = event.navigationTrigger ?? 'imperative';

					return;
				}

				const path = pathOf(event.urlAfterRedirects);
				const moved = path !== this.path;
				this.path = path;

				if (this.first) {
					this.first = false;

					return;
				}

				if (moved && this.trigger === 'imperative') {
					this.viewportScroller.scrollToPosition([0, 0]);
				}
			});
	}
}
