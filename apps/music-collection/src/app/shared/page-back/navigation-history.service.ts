import { filter } from 'rxjs';

import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	NavigationCancel,
	NavigationEnd,
	NavigationError,
	NavigationStart,
	Router,
} from '@angular/router';

/** The address without the query and the fragment: the page it points at. */
function pathOf(url: string): string {
	return url.split(/[?#]/)[0];
}

interface Step {
	/** The whole address, so a list comes back filtered as it was left. */
	url: string;
	path: string;
}

/** Long enough for any reading; a visit is not a log to keep. */
const MAX_DEPTH = 50;

/**
 * The pages of this visit, in the order they were read.
 *
 * "Back" and the breadcrumb answer two different questions, and the app is
 * careful to keep them apart. The breadcrumb says where a page *sits* — it
 * leads to the pages that contain this one, and it says the same thing to
 * every reader. This service says where the reader *was*, which is personal,
 * changes with every step, and is nowhere in the address.
 *
 * A page opened from a link somebody sent has no visit behind it. There is
 * nothing to go back to then, and `canGoBack` says so: the Back control falls
 * back on the breadcrumb's parent rather than walking out of the app.
 *
 * `back()` navigates to the remembered address instead of calling
 * `history.back()`, because several pages write a control's state into the
 * query — the profile's tab strip, the network's depth and guests — and each
 * of those is a browser history entry that is not a page. Walking the stack
 * the app kept lands on the page the reader came from, every time.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
	private readonly router = inject(Router);

	/** The pages behind the one on screen, oldest first. */
	private readonly stack: Step[] = [];
	private readonly depth = signal(0);

	private current: Step = {
		url: this.router.url,
		path: pathOf(this.router.url),
	};

	/** What started the navigation under way; a popstate is the browser's. */
	private trigger: NavigationStart['navigationTrigger'] = 'imperative';

	/**
	 * The navigation that draws the first screen: nothing is behind it.
	 *
	 * Read from the router rather than assumed, because the first page the
	 * service sees is only the first page of the visit when it has been
	 * watching since the app started. It is started there — in the app's
	 * providers — and this keeps a visit whole even if it ever is not.
	 */
	private first = !this.router.navigated;

	/** Set while this service is walking back, so the step is popped. */
	private returning = false;

	/** Whether there is a page of this visit to go back to. */
	public readonly canGoBack = computed(() => this.depth() > 0);

	public constructor() {
		this.router.events
			.pipe(
				filter(
					(
						event
					): event is
						| NavigationStart
						| NavigationEnd
						| NavigationCancel
						| NavigationError =>
						event instanceof NavigationStart ||
						event instanceof NavigationEnd ||
						event instanceof NavigationCancel ||
						event instanceof NavigationError
				),
				takeUntilDestroyed()
			)
			.subscribe((event) => {
				if (event instanceof NavigationStart) {
					this.trigger = event.navigationTrigger ?? 'imperative';

					return;
				}

				if (!(event instanceof NavigationEnd)) {
					// A guard turned the move away: nobody moved anywhere.
					this.returning = false;

					return;
				}

				this.record(event.urlAfterRedirects);
			});
	}

	/**
	 * Goes to the page the reader came from, if this visit has one.
	 * Answers whether it did, so the caller can fall back on the breadcrumb.
	 */
	public back(): boolean {
		const step = this.stack[this.stack.length - 1];

		if (!step) {
			return false;
		}

		this.returning = true;
		void this.router.navigateByUrl(step.url);

		return true;
	}

	private record(url: string): void {
		const step: Step = { url, path: pathOf(url) };
		const returning = this.returning;
		this.returning = false;

		if (this.first) {
			this.first = false;
			this.current = step;

			return;
		}

		// A control writing its state into the address is not a page of its
		// own: going back from it would land on the page already on screen.
		if (step.path === this.current.path) {
			this.current = step;

			return;
		}

		const last = this.stack[this.stack.length - 1];

		if (
			returning ||
			(this.trigger === 'popstate' && last?.path === step.path)
		) {
			this.stack.pop();
		} else {
			this.stack.push(this.current);

			if (this.stack.length > MAX_DEPTH) {
				this.stack.shift();
			}
		}

		this.current = step;
		this.depth.set(this.stack.length);
	}
}
