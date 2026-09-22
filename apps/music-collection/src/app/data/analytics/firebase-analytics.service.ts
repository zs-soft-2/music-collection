import { filter } from 'rxjs/operators';

import { Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getApp } from '@angular/fire/app';
import { Auth, authState } from '@angular/fire/auth';
import { NavigationEnd, Router } from '@angular/router';
import {
	AnalyticsEventName,
	AnalyticsEventParameters,
	AnalyticsService,
} from '@music-collection/api';

import type { Analytics } from 'firebase/analytics';

import { environment } from '../../../environments/environment';
import { MeasurementConsentService } from './measurement-consent.service';
import { MEASUREMENT_OFFERED } from './measurement.setting';

/** The analytics SDK, loaded only once someone has allowed it. */
type AnalyticsSdk = typeof import('firebase/analytics');

/**
 * Firebase Analytics, with the collector's consent as its switch.
 *
 * Nothing is loaded before the answer: the SDK — and with it gtag, and with
 * it the cookies — arrives in a lazy chunk the moment consent is given, and a
 * "no" leaves the app exactly as it was. That is also why this does its own
 * page views and user id instead of AngularFire's tracking services: those
 * want the SDK in the injector from the start.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseAnalyticsService extends AnalyticsService {
	private readonly auth = inject(Auth);
	private readonly router = inject(Router);
	private readonly consent = inject(MeasurementConsentService);

	private sdk: AnalyticsSdk | null = null;
	private analytics: Analytics | null = null;
	/** The one load, however many times the answer arrives. */
	private loading: Promise<void> | null = null;

	/** The uid of the last sign-in state, to tell a sign-in from a reload. */
	private uid: string | null = null;
	private authKnown = false;

	public constructor() {
		super();

		effect(() => {
			const consented = this.consent.consented();

			if (consented) {
				this.start();
			} else if (consented === false) {
				this.stop();
			}
		});

		this.router.events
			.pipe(
				filter(
					(event): event is NavigationEnd =>
						event instanceof NavigationEnd
				),
				takeUntilDestroyed()
			)
			.subscribe(() => this.trackPageView());

		authState(this.auth)
			.pipe(takeUntilDestroyed())
			.subscribe((user) => this.follow(user?.uid ?? null));
	}

	/**
	 * Sends the event, or drops it — before consent, before the SDK is up, or
	 * with measuring switched off there is nothing to send it with, and a
	 * dropped event must never break what was being done.
	 */
	public track(
		name: AnalyticsEventName,
		parameters: AnalyticsEventParameters = {}
	): void {
		if (!this.sdk || !this.analytics || !this.consent.consented()) {
			return;
		}

		// `debug_mode` puts the event in GA4's DebugView within seconds
		// instead of a day later — that is how a dev build is watched at all.
		const event = environment.production
			? { ...parameters }
			: { ...parameters, debug_mode: true };

		if (!environment.production) {
			console.debug('[measurement]', name, event);
		}

		send(this.sdk, this.analytics, name, event);
	}

	/** Starts measuring, or takes it back up after a withdrawal. */
	private start(): void {
		if (!MEASUREMENT_OFFERED) {
			return;
		}

		if (this.sdk && this.analytics) {
			this.sdk.setConsent({ analytics_storage: 'granted' });
			this.sdk.setAnalyticsCollectionEnabled(this.analytics, true);
			this.trackPageView();

			return;
		}

		this.loading ??= this.load().catch((error) => {
			// Blocked SDK, no network, a browser that will not have it: the
			// app goes on unmeasured.
			console.warn('Measurement unavailable', error);
		});
	}

	private async load(): Promise<void> {
		const sdk = await import('firebase/analytics');

		// The answer can be taken back while this was in flight.
		if (!this.consent.consented() || !(await sdk.isSupported())) {
			return;
		}

		// Analytics only, and only because it was allowed. Advertising stays
		// denied: this app has nothing to advertise, and the denial is what
		// keeps gtag from building an ad profile out of the visit.
		sdk.setConsent({
			ad_storage: 'denied',
			ad_user_data: 'denied',
			ad_personalization: 'denied',
			analytics_storage: 'granted',
		});

		this.sdk = sdk;
		this.analytics = sdk.initializeAnalytics(getApp(), {
			config: {
				// The app sends its own: gtag's automatic page view only
				// fires on load, so every later route would go unseen.
				send_page_view: false,
				allow_google_signals: false,
				allow_ad_personalization_signals: false,
				...(environment.production ? {} : { debug_mode: true }),
			},
		});

		this.identify();
		this.trackPageView();
	}

	/**
	 * Stops measuring and clears up after it. The SDK cannot be unloaded once
	 * it is in the page, but with collection off it sends nothing, and the
	 * cookies it wrote go now rather than in two years.
	 */
	private stop(): void {
		if (this.sdk && this.analytics) {
			this.sdk.setAnalyticsCollectionEnabled(this.analytics, false);
			this.sdk.setConsent({ analytics_storage: 'denied' });
		}

		clearMeasurementCookies();
	}

	/** The signed-in state, as a sign-in event and as the reported user. */
	private follow(uid: string | null): void {
		const signedIn = this.authKnown && !this.uid && !!uid;

		this.uid = uid;
		this.authKnown = true;

		this.identify();

		if (signedIn) {
			this.track('login', { method: 'google' });
		}
	}

	/**
	 * Ties the events to the account rather than to the browser, so the same
	 * collector on a phone and a laptop is one person in the reports. The uid
	 * is the app's own id: it says nothing about who they are outside it.
	 */
	private identify(): void {
		if (!this.sdk || !this.analytics) {
			return;
		}

		this.sdk.setUserId(this.analytics, this.uid);
	}

	private trackPageView(): void {
		// The path only: a query string can carry what someone typed into a
		// search box, and the page is the whole question here.
		const path = this.router.url.split(/[?#]/)[0];

		this.track('page_view', {
			page_path: path,
			page_location: `${location.origin}${path}`,
			page_title: document.title,
		});
	}
}

/**
 * `logEvent` is overloaded once per GA4 event name, and our names are a union
 * of several of them — the call itself is the same for all, so it goes
 * through one signature.
 */
function send(
	sdk: AnalyticsSdk,
	analytics: Analytics,
	name: AnalyticsEventName,
	parameters: Record<string, unknown>
): void {
	(
		sdk.logEvent as (
			instance: Analytics,
			name: string,
			parameters?: Record<string, unknown>
		) => void
	)(analytics, name, parameters);
}

/** Takes back the cookies gtag left on this domain. */
function clearMeasurementCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0].trim();

		if (!name.startsWith('_ga')) {
			continue;
		}

		document.cookie = `${name}=; Max-Age=0; path=/`;
		document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname}`;
	}
}
