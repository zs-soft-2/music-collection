import { AutopilotService, DemoScript } from '@zssz-soft/demo-autopilot-core';

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { DEMO_TOUR_SETTING } from './demo-tour.setting';

/** The two chains, once the walkthroughs have been fetched. */
interface Tours {
	guest: readonly DemoScript[];
	collector: readonly DemoScript[];
}

/**
 * The guided tour: whether it is offered at all, which chain fits the viewer,
 * and the walking on from one page to the next.
 *
 * There are two chains because the app is two apps. A visitor is walked
 * through the pages a visitor may open and left at the way in; a collector is
 * walked through their own — the shelf, the scan, the radio, the game — and
 * left in the profile, at the switch that turns this off. Only the first page
 * of the fitting chain is registered, so the launcher offers a walkthrough
 * rather than a list.
 *
 * Each page is a script of its own, and the next starts when the one before
 * it is through. That is what makes the tour walk: a script's setup route
 * opens its page, so nothing invisible sits between two stops, the back
 * button lands on the words the viewer just read, and the counter in the
 * tooltip counts the page rather than the whole app.
 *
 * The scripts are fetched the first time they are needed rather than bundled
 * with the app, because most loads never ask for them.
 */
@Injectable({ providedIn: 'root' })
export class DemoTourService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly autopilot = inject(AutopilotService);

	/** What the collector chose; null while they have not chosen. */
	private readonly chosen = signal<boolean | null>(null);
	private readonly signedIn = signal(false);

	/** The switch as the profile draws it: unanswered reads as on. */
	public readonly wanted = computed(() => this.chosen() !== false);

	/** Whether the launcher may be on the page at all. */
	public readonly enabled = computed(() => this.wanted());

	/** The walkthroughs, once fetched; the same objects on every later start. */
	private loading: Promise<Tours> | null = null;
	private tours: Tours | null = null;

	/** Whether the shell has put the launcher on the page. */
	private readonly asked = signal(false);

	public constructor() {
		this.settings
			.value$(DEMO_TOUR_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe(({ enabled }) => this.chosen.set(enabled));

		this.authenticatedUser.user$
			.pipe(takeUntilDestroyed())
			.subscribe((user) => this.signedIn.set(!!user));

		// One page through: on to the next, which opens its own page. Where
		// the run was started from does not matter — the launcher starts the
		// first page by id, and the chain is found from whichever finished.
		//
		// A run that was cancelled or failed stops the chain: whoever closed
		// the overlay asked for the app back, not for the next page of it.
		this.autopilot.results$
			.pipe(takeUntilDestroyed())
			.subscribe((result) => {
				if (result.status !== 'passed') {
					return;
				}

				const next = this.after(result.scriptId);

				if (next) {
					this.autopilot.startDemo(next);
				}
			});

		// Switched off while the tour is playing: leaving it running would
		// keep moving the app under somebody who just asked it to stop.
		effect(() => {
			if (!this.enabled()) {
				this.autopilot.cancel();
				this.autopilot.reset();
			}
		});

		// Signing in (or out) changes which chain fits, and the one on offer
		// has to change with it: the visitor's walks pages the collector's
		// skips, and ends at a sign-in button the collector no longer has.
		effect(() => {
			if (!this.asked()) {
				return;
			}

			// Tracked on purpose: this is the signal the offer follows.
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
	 * Registers the walkthrough that fits with the autopilot, which is what
	 * puts it in the launcher's menu. Called by the shell once the launcher is
	 * on the page.
	 */
	public prepare(): void {
		// The hook above does the registering, here and on every later change
		// of the sign-in state; doing it here as well would hand the same
		// walkthrough over twice.
		this.asked.set(true);
	}

	/** Plays the chain that fits, from the first stop of its first page. */
	public start(): void {
		this.offer()
			.then((first) => {
				// `startDemo` subscribes to the run itself; subscribing to
				// what it returns would play the script a second time.
				this.autopilot.startDemo(first);
			})
			.catch((error) => {
				console.error('Demo tour not started', error);
			});
	}

	/** Puts the fitting chain's first page on offer, and takes the other back. */
	private async offer(): Promise<DemoScript> {
		const tours = await this.load();
		const [fits] = this.chainOf(tours);
		const [other] = this.signedIn() ? tours.guest : tours.collector;

		this.autopilot.unregisterScript(other.id);
		this.autopilot.registerScript(fits);

		return fits;
	}

	/** The page after the one that just finished, if the chain goes on. */
	private after(scriptId: string): DemoScript | undefined {
		if (!this.tours) {
			return undefined;
		}

		const chain = this.chainOf(this.tours);
		const at = chain.findIndex((script) => script.id === scriptId);

		return at < 0 ? undefined : chain[at + 1];
	}

	private chainOf(tours: Tours): readonly DemoScript[] {
		return this.signedIn() ? tours.collector : tours.guest;
	}

	private load(): Promise<Tours> {
		this.loading ??= import('./tours.script').then(
			({ guestTours, collectorTours }) => {
				this.tours = { guest: guestTours, collector: collectorTours };

				return this.tours;
			}
		);

		return this.loading;
	}
}
