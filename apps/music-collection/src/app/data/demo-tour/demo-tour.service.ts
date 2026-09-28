import { DemoScript, AutopilotService } from '@zssz-soft/demo-autopilot-core';

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { DEMO_TOUR_SETTING } from './demo-tour.setting';

/**
 * The guided tour of the app: whether it is offered at all, and the one place
 * that starts it.
 *
 * The walkthrough itself is a script the demo autopilot plays
 * (`app-tour.script.ts`); it is fetched the first time it is needed rather
 * than bundled with the app, because most loads never ask for it.
 *
 * The tour walks the collector's own pages — their shelf, their wishlist,
 * their radio — so it is only offered to somebody signed in. A guest would be
 * turned back by the route guards halfway through the story.
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
	public readonly enabled = computed(() => this.signedIn() && this.wanted());

	/** The script, once fetched; the same object on every later start. */
	private loading: Promise<DemoScript> | null = null;

	public constructor() {
		this.settings
			.value$(DEMO_TOUR_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe(({ enabled }) => this.chosen.set(enabled));

		this.authenticatedUser.user$
			.pipe(takeUntilDestroyed())
			.subscribe((user) => this.signedIn.set(!!user));

		// Switched off — or signed out — while the tour is playing: the
		// walkthrough drives the router, so leaving it running would keep
		// moving the app under somebody who just asked it to stop.
		effect(() => {
			if (!this.enabled()) {
				this.autopilot.cancel();
				this.autopilot.reset();
			}
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
	 * Registers the tour with the autopilot, which is what puts it in the
	 * launcher's menu. Called by the shell once the launcher is on the page.
	 */
	public prepare(): void {
		this.load().catch((error) => {
			console.error('Demo tour not loaded', error);
		});
	}

	/** Plays the tour from its first step. */
	public start(): void {
		this.load()
			.then((script) => {
				// `startDemo` subscribes to the run itself; subscribing to
				// what it returns would play the script a second time.
				this.autopilot.startDemo(script);
			})
			.catch((error) => {
				console.error('Demo tour not started', error);
			});
	}

	private load(): Promise<DemoScript> {
		this.loading ??= import('./app-tour.script').then(
			({ appTourScript }) => {
				this.autopilot.registerScript(appTourScript);

				return appTourScript;
			}
		);

		return this.loading;
	}
}
