import { DemoScript, AutopilotService } from '@zssz-soft/demo-autopilot-core';

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { DEMO_TOUR_SETTING } from './demo-tour.setting';

/**
 * The guided tour of the home page: whether it is offered at all, which of
 * the two walkthroughs fits the viewer, and the one place that starts it.
 *
 * There are two because the page is two pages. A visitor is shown the catalog
 * and the way in; a collector is shown the rows that only exist once there is
 * a shelf behind them. Only the one that fits is ever registered, so the
 * launcher offers a walkthrough rather than a choice nobody asked for.
 *
 * Both are fetched the first time they are needed rather than bundled with
 * the app, because most loads never ask for either.
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
	private loading: Promise<{
		guest: DemoScript;
		collector: DemoScript;
	}> | null = null;

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

		// Switched off while the tour is playing: leaving it running would
		// keep moving the app under somebody who just asked it to stop.
		effect(() => {
			if (!this.enabled()) {
				this.autopilot.cancel();
				this.autopilot.reset();
			}
		});

		// Signing in (or out) changes which walkthrough fits, and the one on
		// offer has to change with it: the visitor's ends at the sign-in
		// button, which the collector no longer has.
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

	/** Plays the walkthrough that fits, from its first step. */
	public start(): void {
		this.offer()
			.then((script) => {
				// `startDemo` subscribes to the run itself; subscribing to
				// what it returns would play the script a second time.
				this.autopilot.startDemo(script);
			})
			.catch((error) => {
				console.error('Demo tour not started', error);
			});
	}

	/** Puts the fitting walkthrough on offer, and takes the other one back. */
	private async offer(): Promise<DemoScript> {
		const { guest, collector } = await this.load();
		const fits = this.signedIn() ? collector : guest;
		const other = this.signedIn() ? guest : collector;

		this.autopilot.unregisterScript(other.id);
		this.autopilot.registerScript(fits);

		return fits;
	}

	private load(): Promise<{ guest: DemoScript; collector: DemoScript }> {
		this.loading ??= import('./home-tour.script').then(
			({ homeGuestTour, homeCollectorTour }) => ({
				guest: homeGuestTour,
				collector: homeCollectorTour,
			})
		);

		return this.loading;
	}
}
