import {
	AutopilotService,
	DemoScript,
	DemoStep,
} from '@zssz-soft/demo-autopilot-core';
import { filter } from 'rxjs';

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { DEMO_TOUR_SETTING } from './demo-tour.setting';

/** What the lazily fetched module hands back. */
type Tours = typeof import('./tours.script');

/**
 * Whether the page is drawing something a stop could point at.
 *
 * Not merely in the document: a card inside a collapsed panel is there and
 * takes up no room, and a tab that is not the open one is gone altogether.
 * Either way there is nothing to cut a spotlight out of.
 */
function drawn(selector: string | undefined): boolean {
	if (!selector || typeof document === 'undefined') {
		return false;
	}

	const element = document.querySelector(selector);

	return !!element && element.getClientRects().length > 0;
}

/**
 * The page's walkthrough as the autopilot gets it: the same script, without
 * the stops that have nothing to point at.
 *
 * A page draws what the collector has. The wishlist has no "found it" button
 * before anything has been found, the scan has no results before the
 * photograph. A stop whose element is not there fails, and a failed step ends
 * the run — in front of whoever was being shown around, halfway through a
 * sentence.
 *
 * The reading stops at the first stop that opens something. From there on the
 * page as it stands says nothing about what the run will find: the profile's
 * walkthrough presses its way through four tabs, and three of them are not
 * drawn until it has. Everything after that stop is kept and walked, which is
 * the whole point of a stop that opens — it is the script saying it knows
 * better than the screen what comes next.
 *
 * A page nobody is signed in to loses those stops as well, and rightly: the
 * profile draws no tab strip to a stranger, so the stop that would have
 * opened the first tab is not there to vouch for the rest either.
 *
 * Which stops those are is settled when the run starts rather than when the
 * page is offered one: `steps` is read for the first time as the runner opens
 * the script, which is after the page has finished arriving. It is then kept,
 * because the tooltip's counter, the back button and the runner's own loop all
 * read it and have to agree on what they are counting.
 */
function onThisPage(script: DemoScript): DemoScript {
	let walked: readonly DemoStep[] | null = null;

	return {
		...script,
		get steps(): readonly DemoStep[] {
			walked ??= walkable(script.steps);

			return walked;
		},
	};
}

/** The stops this page can be walked through, in order. */
function walkable(steps: readonly DemoStep[]): readonly DemoStep[] {
	const kept: DemoStep[] = [];
	let opening = false;

	for (const step of steps) {
		if (!opening && !drawn(step.highlight?.selector)) {
			continue;
		}

		kept.push(step);
		// A stop that presses something changes the page under the rest of
		// the script, so it is the last one worth reading the page for.
		opening ||= step.action.type === 'click';
	}

	return kept;
}

/**
 * The guided tour: whether it is offered at all, and which walkthrough the
 * launcher holds while the collector is where they are.
 *
 * The tour is the page's rather than the app's. Whoever presses the launcher
 * is reading a screen and wants to know what is on it — so the walkthrough on
 * offer is always the one written for the page the app is on, and it neither
 * opens another page nor moves on to one when it is through. The launcher
 * itself rides in the shell, so it is there on every page until the profile
 * switch takes it away.
 *
 * The home page is the one screen with two walkthroughs, because it is two
 * screens: a visitor is shown what the catalog is and left at the way in, a
 * collector is shown what the page brought up from their own shelf.
 *
 * The scripts are fetched the first time they are needed rather than bundled
 * with the app, because most loads never ask for them.
 */
@Injectable({ providedIn: 'root' })
export class DemoTourService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly autopilot = inject(AutopilotService);
	private readonly router = inject(Router);

	/** What the collector chose; null while they have not chosen. */
	private readonly chosen = signal<boolean | null>(null);
	private readonly signedIn = signal(false);
	/** The page the app is on, which is the page the tour talks about. */
	private readonly page = signal('');

	/** The switch as the profile draws it: unanswered reads as on. */
	public readonly wanted = computed(() => this.chosen() !== false);

	/** Whether the launcher may be on the page at all. */
	public readonly enabled = computed(() => this.wanted());

	/** The walkthroughs, once fetched; the same module on every later start. */
	private loading: Promise<Tours> | null = null;

	/** Whether the shell has put the launcher on the page. */
	private readonly asked = signal(false);

	/** What the launcher is holding, so it can be taken back on the way out. */
	private offered: string | null = null;

	public constructor() {
		this.settings
			.value$(DEMO_TOUR_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe(({ enabled }) => this.chosen.set(enabled));

		this.authenticatedUser.user$
			.pipe(takeUntilDestroyed())
			.subscribe((user) => this.signedIn.set(!!user));

		this.page.set(this.router.url);
		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed()
			)
			.subscribe(() => this.page.set(this.router.url));

		// A run that is through leaves its own walkthrough on offer, so it can
		// be walked again — but freshly, because what the page draws may have
		// changed while it was being read.
		this.autopilot.results$
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.refresh());

		// Switched off while the tour is playing: leaving it running would
		// keep moving the app under somebody who just asked it to stop.
		effect(() => {
			if (!this.enabled()) {
				this.autopilot.cancel();
				this.autopilot.reset();
				this.withdraw();
			}
		});

		// The page decides the walkthrough, and so does the sign-in state: the
		// visitor's home page is not the collector's. Both are tracked here,
		// and every change puts a different one in the launcher's hand.
		effect(() => {
			if (!this.asked() || !this.enabled()) {
				return;
			}

			// Tracked on purpose: these are the signals the offer follows.
			this.page();
			this.signedIn();

			this.offer().catch((error) => {
				console.error('Demo tour not offered', error);
			});
		});
	}

	/** Records the choice, and stops a tour the collector just switched off. */
	public decide(enabled: boolean): void {
		this.chosen.set(enabled);

		this.settings.save(DEMO_TOUR_SETTING, { enabled }).catch((error) => {
			console.error('Demo tour setting not saved', error);
		});
	}

	/**
	 * Registers this page's walkthrough with the autopilot, which is what puts
	 * it in the launcher's menu. Called by the shell once the launcher is on
	 * the page.
	 */
	public prepare(): void {
		// The hook above does the registering, here and on every later change
		// of page or sign-in state; doing it here as well would hand the same
		// walkthrough over twice.
		this.asked.set(true);
	}

	/** Plays the walkthrough of the page the collector is standing on. */
	public start(): void {
		this.offer()
			.then((script) => {
				if (!script) {
					return;
				}

				// `startDemo` subscribes to the run itself; subscribing to
				// what it returns would play the script a second time.
				this.autopilot.startDemo(script);
			})
			.catch((error) => {
				console.error('Demo tour not started', error);
			});
	}

	/**
	 * Puts this page's walkthrough on offer and takes back the page before's.
	 *
	 * The launcher hides itself when it is holding nothing, which is what a
	 * page with no walkthrough of its own — an admin table, a form mid-flow —
	 * should leave behind rather than a button that explains somewhere else.
	 */
	private async offer(): Promise<DemoScript | undefined> {
		const { tourFor } = await this.load();
		const fits = tourFor(this.page(), this.signedIn());

		if (this.offered && this.offered !== fits?.id) {
			this.withdraw();
		}

		if (!fits) {
			return undefined;
		}

		const offered = onThisPage(fits);

		// Registering the same id again replaces it, which is the point on a
		// second offer: the stops are read off the page as it is now.
		this.autopilot.registerScript(offered);
		this.offered = offered.id;

		return offered;
	}

	/** Hands this page's walkthrough over again, its stops unread. */
	private refresh(): void {
		if (!this.asked() || !this.enabled()) {
			return;
		}

		this.offer().catch((error) => {
			console.error('Demo tour not offered', error);
		});
	}

	private withdraw(): void {
		if (!this.offered) {
			return;
		}

		this.autopilot.unregisterScript(this.offered);
		this.offered = null;
	}

	private load(): Promise<Tours> {
		this.loading ??= import('./tours.script');

		return this.loading;
	}
}
