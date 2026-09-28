import { AutopilotService, ScriptResult } from '@zssz-soft/demo-autopilot-core';
import { BehaviorSubject, Subject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { AuthenticatedUserService } from '@music-collection/api';

import { UserSettingsEffect } from '../user-settings';
import { DemoTourService } from './demo-tour.service';
import { DemoTourSettings } from './demo-tour.setting';

/** Lets a dynamic import and the promise chain behind it settle. */
const flush = (): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, 0));

describe('DemoTourService', () => {
	let stored: BehaviorSubject<DemoTourSettings>;
	let user$: BehaviorSubject<{ uid: string } | null>;
	let save: jest.Mock;
	let results: Subject<ScriptResult>;
	let router: { url: string; events: Subject<NavigationEnd> };
	let autopilot: {
		cancel: jest.Mock;
		reset: jest.Mock;
		registerScript: jest.Mock;
		unregisterScript: jest.Mock;
		startDemo: jest.Mock;
		results$: Subject<ScriptResult>;
	};

	/** What a finished run looks like to the service. */
	const finished = (scriptId: string, status = 'passed'): ScriptResult =>
		({ scriptId, status }) as ScriptResult;

	/** The ids handed to the autopilot, in the order they were handed over. */
	const registered = (): string[] =>
		autopilot.registerScript.mock.calls.map(([script]) => script.id);

	const tour = (): DemoTourService => TestBed.inject(DemoTourService);

	/** The app arriving on a page, as the launcher hears about it. */
	const open = (url: string): void => {
		router.url = url;
		router.events.next(new NavigationEnd(1, url, url));
	};

	/** The stops of the walkthrough last handed to the launcher. */
	const stops = (): string[] =>
		autopilot.registerScript.mock.calls
			.at(-1)?.[0]
			.steps.map((step: { id: string }) => step.id) ?? [];

	/**
	 * What the page is drawing, as the service reads it.
	 *
	 * jsdom lays nothing out, so every element it holds reads as taking up no
	 * room and the service would find the page empty. The measurement is
	 * stubbed instead: whatever the test puts in the document is drawn, and
	 * whatever it leaves out is not — which is exactly how a profile tab that
	 * is not the open one behaves.
	 */
	const draws = (markup: string): void => {
		document.body.innerHTML = markup;
	};

	/** The profile as a signed-in collector first meets it: one tab of four. */
	const PROFILE_ON_ITS_FIRST_TAB = `
		<div class="page">
			<div class="hero"></div>
			<div class="tabs">
				<button id="mc-profile-tab-account"></button>
				<button id="mc-profile-tab-collection"></button>
				<button id="mc-profile-tab-playback"></button>
				<button id="mc-profile-tab-data"></button>
			</div>
			<mc-profile-account></mc-profile-account>
			<mc-profile-language></mc-profile-language>
			<mc-profile-appearance></mc-profile-appearance>
			<mc-profile-demo-tour></mc-profile-demo-tour>
		</div>
	`;

	/** jsdom measures nothing, so the test says what the page is drawing. */
	const measured = Element.prototype.getClientRects;

	beforeAll(() => {
		Element.prototype.getClientRects = function (this: Element) {
			return [{}] as unknown as DOMRectList;
		};
	});

	afterAll(() => {
		Element.prototype.getClientRects = measured;
	});

	beforeEach(() => {
		document.body.innerHTML = '';
		stored = new BehaviorSubject<DemoTourSettings>({ enabled: null });
		user$ = new BehaviorSubject<{ uid: string } | null>(null);
		save = jest.fn(() => Promise.resolve());
		results = new Subject<ScriptResult>();
		router = { url: '/home', events: new Subject<NavigationEnd>() };
		autopilot = {
			cancel: jest.fn(),
			reset: jest.fn(),
			registerScript: jest.fn(),
			unregisterScript: jest.fn(),
			startDemo: jest.fn(),
			results$: results,
		};

		TestBed.configureTestingModule({
			providers: [
				DemoTourService,
				{
					provide: UserSettingsEffect,
					useValue: { value$: () => stored, save },
				},
				{ provide: AuthenticatedUserService, useValue: { user$ } },
				{ provide: AutopilotService, useValue: autopilot },
				{ provide: Router, useValue: router },
			],
		});
	});

	it('offers the tour to a collector who has never answered', () => {
		user$.next({ uid: 'u1' });

		expect(tour().enabled()).toBe(true);
	});

	/** A visitor gets one too — their own, which ends at the way in. */
	it('offers it to a guest as well', () => {
		expect(tour().enabled()).toBe(true);
	});

	it('leaves it off once it has been switched off', () => {
		stored.next({ enabled: false });

		const service = tour();

		expect(service.wanted()).toBe(false);
		expect(service.enabled()).toBe(false);
	});

	it('keeps the choice with the account', () => {
		tour().decide(false);

		expect(save).toHaveBeenCalledWith(expect.anything(), {
			enabled: false,
		});
	});

	/**
	 * Switched off mid-walk, the tour has to stop: it drives the page under
	 * somebody who just said they had seen enough.
	 */
	it('stops a tour the collector switches off', () => {
		const service = tour();

		TestBed.tick();
		autopilot.cancel.mockClear();
		autopilot.reset.mockClear();

		service.decide(false);
		TestBed.tick();

		expect(autopilot.cancel).toHaveBeenCalled();
		expect(autopilot.reset).toHaveBeenCalled();
	});

	it('offers a guest the visitor’s home walkthrough', async () => {
		tour().prepare();
		await flush();

		expect(registered()).toEqual(['home-guest']);
	});

	it('offers a signed-in collector their own', async () => {
		user$.next({ uid: 'u1' });

		tour().prepare();
		await flush();

		expect(registered()).toEqual(['home-collector']);
	});

	/**
	 * The visitor's walkthrough ends at the sign-in button, which the
	 * collector no longer has — so signing in has to change what is on offer,
	 * not only what it says.
	 */
	it('swaps the walkthrough when the visitor signs in', async () => {
		const service = tour();

		service.prepare();
		await flush();
		expect(registered()).toEqual(['home-guest']);

		user$.next({ uid: 'u1' });
		TestBed.tick();
		await flush();

		expect(registered()).toEqual(['home-guest', 'home-collector']);
		expect(autopilot.unregisterScript).toHaveBeenCalledWith('home-guest');
	});

	/**
	 * The point of the whole thing: the launcher holds the page the collector
	 * is reading, so pressing it explains that page rather than starting the
	 * app over somewhere else.
	 */
	it('holds the walkthrough of the page the app is on', async () => {
		const service = tour();

		user$.next({ uid: 'u1' });
		service.prepare();
		await flush();

		open('/profile');
		TestBed.tick();
		await flush();

		expect(registered().at(-1)).toBe('page-profile');
		expect(autopilot.unregisterScript).toHaveBeenCalledWith(
			'home-collector'
		);
	});

	it('plays the page it is standing on rather than the first one', async () => {
		const service = tour();

		user$.next({ uid: 'u1' });
		open('/profile');

		service.start();
		await flush();

		expect(autopilot.startDemo).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'page-profile' })
		);
	});

	/** A page nothing is written for leaves the launcher holding nothing. */
	it('takes the offer back on a page it cannot talk about', async () => {
		const service = tour();

		user$.next({ uid: 'u1' });
		service.prepare();
		await flush();

		open('/admin/album');
		TestBed.tick();
		await flush();

		expect(autopilot.unregisterScript).toHaveBeenCalledWith(
			'home-collector'
		);
		expect(registered()).toEqual(['home-collector']);
	});

	/**
	 * A walkthrough that is through stays on offer, so it can be walked
	 * again — but handed over afresh, because the stops are read off the page
	 * as it is when the run starts.
	 */
	it('offers the same page again once a run is through', async () => {
		const service = tour();

		service.prepare();
		await flush();

		results.next(finished('home-guest'));
		await flush();

		expect(registered()).toEqual(['home-guest', 'home-guest']);
		expect(autopilot.startDemo).not.toHaveBeenCalled();
	});

	/**
	 * A stop with nothing to point at fails, and a failed step ends the run in
	 * front of whoever pressed the launcher — so the stops are read off the
	 * page as it stands when the run starts.
	 */
	it('leaves out the stops the page is not drawing', async () => {
		const service = tour();

		draws(`
			<div class="page">
				<div class="hero"></div>
			</div>
		`);
		user$.next({ uid: 'u1' });
		open('/profile');
		service.prepare();
		await flush();

		expect(stops()).toEqual(['intro']);
	});

	/**
	 * Except where the walkthrough is about to change the page itself. The
	 * profile draws one tab of four and the tour presses the other three
	 * open — so from the first stop that presses, the page as it stands says
	 * nothing about what the run will find, and the rest is walked.
	 */
	it('keeps the stops behind a tab the walk opens itself', async () => {
		const service = tour();

		draws(PROFILE_ON_ITS_FIRST_TAB);
		user$.next({ uid: 'u1' });
		open('/profile');
		service.prepare();
		await flush();

		expect(stops()).toEqual([
			'intro',
			'tabs',
			'accountTab',
			'account',
			'language',
			'appearance',
			'collectionTab',
			'lists',
			'shelves',
			'playbackTab',
			'playback',
			'spotify',
			'dataTab',
			'listening',
			'privacy',
			'back',
			'switch',
		]);
	});

	/**
	 * A stranger gets no tab strip, so the stop that would have opened the
	 * first tab is not there to vouch for the rest either.
	 */
	it('vouches for nothing on a page that draws no way in', async () => {
		const service = tour();

		draws(`
			<div class="page">
				<div class="hero"></div>
			</div>
		`);
		open('/profile');
		service.prepare();
		await flush();

		expect(stops()).toEqual(['intro']);
	});
});
