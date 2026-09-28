import { AutopilotService } from '@zssz-soft/demo-autopilot-core';
import { BehaviorSubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
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
	let autopilot: {
		cancel: jest.Mock;
		reset: jest.Mock;
		registerScript: jest.Mock;
		unregisterScript: jest.Mock;
		startDemo: jest.Mock;
	};

	/** The ids handed to the autopilot, in the order they were handed over. */
	const registered = (): string[] =>
		autopilot.registerScript.mock.calls.map(([script]) => script.id);

	const tour = (): DemoTourService => TestBed.inject(DemoTourService);

	beforeEach(() => {
		stored = new BehaviorSubject<DemoTourSettings>({ enabled: null });
		user$ = new BehaviorSubject<{ uid: string } | null>(null);
		save = jest.fn(() => Promise.resolve());
		autopilot = {
			cancel: jest.fn(),
			reset: jest.fn(),
			registerScript: jest.fn(),
			unregisterScript: jest.fn(),
			startDemo: jest.fn(),
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

	it('offers a guest the visitor’s walkthrough', async () => {
		tour().prepare();
		await flush();

		expect(registered()).toEqual(['home-guest']);
		expect(autopilot.unregisterScript).toHaveBeenCalledWith(
			'home-collector'
		);
	});

	it('offers a signed-in collector their own', async () => {
		user$.next({ uid: 'u1' });

		tour().prepare();
		await flush();

		expect(registered()).toEqual(['home-collector']);
		expect(autopilot.unregisterScript).toHaveBeenCalledWith('home-guest');
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
	});

	it('plays the walkthrough that fits', async () => {
		user$.next({ uid: 'u1' });

		tour().start();
		await flush();

		expect(autopilot.startDemo).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'home-collector' })
		);
	});
});
