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
		startDemo: jest.Mock;
	};

	const tour = (): DemoTourService => TestBed.inject(DemoTourService);

	beforeEach(() => {
		stored = new BehaviorSubject<DemoTourSettings>({ enabled: null });
		user$ = new BehaviorSubject<{ uid: string } | null>({ uid: 'u1' });
		save = jest.fn(() => Promise.resolve());
		autopilot = {
			cancel: jest.fn(),
			reset: jest.fn(),
			registerScript: jest.fn(),
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
		expect(tour().enabled()).toBe(true);
	});

	it('leaves it off once it has been switched off', () => {
		stored.next({ enabled: false });

		const service = tour();

		expect(service.wanted()).toBe(false);
		expect(service.enabled()).toBe(false);
	});

	/**
	 * The walkthrough opens the collection, the wishlist, the radio — pages a
	 * guest is turned back from. Offering it to them would be offering a story
	 * that breaks off at its second chapter.
	 */
	it('never offers it to a guest', () => {
		user$.next(null);

		const service = tour();

		expect(service.wanted()).toBe(true);
		expect(service.enabled()).toBe(false);
	});

	it('keeps the choice with the account', () => {
		tour().decide(false);

		expect(save).toHaveBeenCalledWith(expect.anything(), {
			enabled: false,
		});
	});

	/**
	 * The tour drives the router. Switched off mid-walk, it has to stop moving
	 * the app under the collector who just said they had seen enough.
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

	it('hands the walkthrough to the autopilot once, however often it runs', async () => {
		const service = tour();

		service.start();
		await flush();
		service.start();
		await flush();

		expect(autopilot.registerScript).toHaveBeenCalledTimes(1);
		expect(autopilot.startDemo).toHaveBeenCalledTimes(2);
		expect(autopilot.startDemo).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: 'app-tour' })
		);
	});
});
