import { Subject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	Event,
	NavigationCancel,
	NavigationCancellationCode,
	NavigationEnd,
	NavigationStart,
	Router,
} from '@angular/router';

import { NavigationHistoryService } from './navigation-history.service';

describe('NavigationHistoryService', () => {
	let router: {
		url: string;
		events: Subject<Event>;
		navigateByUrl: jest.Mock;
	};
	let history: NavigationHistoryService;
	let id: number;

	/** A navigation the reader started, by a link or a button. */
	const go = (url: string): void => navigate(url, 'imperative');

	/** The same navigation, started by the back or the forward button. */
	const browserBack = (url: string): void => navigate(url, 'popstate');

	const navigate = (
		url: string,
		trigger: 'imperative' | 'popstate'
	): void => {
		id += 1;
		router.events.next(new NavigationStart(id, url, trigger));
		router.url = url;
		router.events.next(new NavigationEnd(id, url, url));
	};

	/** The step `back()` took, as the router was asked to take it. */
	const back = (): string | null => {
		const took = history.back();
		const url = router.navigateByUrl.mock.calls[0]?.[0] ?? null;

		router.navigateByUrl.mockClear();

		return took ? url : null;
	};

	beforeEach(() => {
		router = {
			url: '/',
			events: new Subject<Event>(),
			// The service navigates itself, so the move is played back in.
			navigateByUrl: jest.fn((url: string) => go(url)),
		};
		id = 0;

		TestBed.configureTestingModule({
			providers: [{ provide: Router, useValue: router }],
		});
		history = TestBed.inject(NavigationHistoryService);
	});

	it('has nothing behind the page a link opened on', () => {
		go('/artist/1');

		expect(history.canGoBack()).toBe(false);
		expect(back()).toBeNull();
	});

	it('goes back to the page the reader came from', () => {
		go('/collections/bay-area');
		go('/album/1');

		expect(history.canGoBack()).toBe(true);
		expect(back()).toBe('/collections/bay-area');
	});

	it('comes back to a list as it was left', () => {
		go('/collection?format=lp');
		go('/album/1');

		expect(back()).toBe('/collection?format=lp');
	});

	it('does not count a control writing its state into the address', () => {
		go('/home');
		go('/profile');
		go('/profile?tab=collection');
		go('/profile?tab=shelves');

		// Three addresses, one page: back is out of the profile, not one
		// tab to the left.
		expect(back()).toBe('/home');
	});

	it('leaves nothing behind once the reader has gone back', () => {
		go('/home');
		go('/album/1');
		back();

		expect(history.canGoBack()).toBe(false);
	});

	it('follows the browser back button', () => {
		go('/home');
		go('/album/1');
		browserBack('/home');

		expect(history.canGoBack()).toBe(false);
	});

	it('keeps the page a forward step came from', () => {
		go('/home');
		go('/album/1');
		browserBack('/home');
		browserBack('/album/1');

		expect(back()).toBe('/home');
	});

	it('forgets a move a guard turned away', () => {
		go('/home');
		id += 1;
		router.events.next(new NavigationStart(id, '/admin', 'imperative'));
		router.events.next(
			new NavigationCancel(
				id,
				'/admin',
				'',
				NavigationCancellationCode.GuardRejected
			)
		);
		go('/album/1');

		expect(back()).toBe('/home');
	});
});

describe('NavigationHistoryService started mid-visit', () => {
	it('counts the move it was started on', () => {
		const router = {
			url: '/collections/bay-area',
			// The app has been navigating for a while already.
			navigated: true,
			events: new Subject<Event>(),
			navigateByUrl: jest.fn(),
		};

		TestBed.configureTestingModule({
			providers: [{ provide: Router, useValue: router }],
		});

		const history = TestBed.inject(NavigationHistoryService);

		router.events.next(new NavigationStart(1, '/album/1', 'imperative'));
		router.url = '/album/1';
		router.events.next(new NavigationEnd(1, '/album/1', '/album/1'));

		expect(history.canGoBack()).toBe(true);
		history.back();
		expect(router.navigateByUrl).toHaveBeenCalledWith(
			'/collections/bay-area'
		);
	});
});
