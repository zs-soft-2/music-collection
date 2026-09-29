import { Subject } from 'rxjs';

import { ViewportScroller } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Event, NavigationEnd, NavigationStart, Router } from '@angular/router';

import { PageScrollService } from './page-scroll.service';

describe('PageScrollService', () => {
	let router: { url: string; events: Subject<Event> };
	let scrollToPosition: jest.Mock;
	let id: number;

	/** A navigation the reader started, by a link or a button. */
	const go = (url: string): void => navigate(url, 'imperative');

	/** The same navigation, started by the back or the forward button. */
	const goBack = (url: string): void => navigate(url, 'popstate');

	const navigate = (
		url: string,
		trigger: 'imperative' | 'popstate'
	): void => {
		id += 1;
		router.events.next(new NavigationStart(id, url, trigger));
		router.url = url;
		router.events.next(new NavigationEnd(id, url, url));
	};

	/** Whether the page was taken to its top since the last look. */
	const scrolled = (): boolean => {
		const was = scrollToPosition.mock.calls.length > 0;
		scrollToPosition.mockClear();

		return was;
	};

	beforeEach(() => {
		router = { url: '/', events: new Subject<Event>() };
		scrollToPosition = jest.fn();
		id = 0;

		TestBed.configureTestingModule({
			providers: [
				{ provide: Router, useValue: router },
				{ provide: ViewportScroller, useValue: { scrollToPosition } },
			],
		});
		TestBed.inject(PageScrollService);
	});

	it('leaves the first screen alone', () => {
		go('/home');

		expect(scrolled()).toBe(false);
	});

	it('opens the next page at its top', () => {
		go('/home');
		go('/album/1');

		expect(scrolled()).toBe(true);
	});

	it('opens another of the same kind at its top', () => {
		go('/home');
		go('/album/1');
		scrolled();
		go('/album/2');

		expect(scrolled()).toBe(true);
	});

	it('stays put when only the query changes', () => {
		go('/home');
		go('/profile');
		scrolled();
		go('/profile?tab=collection');

		expect(scrolled()).toBe(false);
	});

	it('stays put when only the fragment changes', () => {
		go('/home');
		go('/artist/1');
		scrolled();
		go('/artist/1#albums');

		expect(scrolled()).toBe(false);
	});

	it('leaves back and forward to the browser', () => {
		go('/home');
		go('/album/1');
		scrolled();
		goBack('/home');

		expect(scrolled()).toBe(false);
	});

	it('follows a link taken after a step back', () => {
		go('/home');
		go('/album/1');
		goBack('/home');
		scrolled();
		go('/album/2');

		expect(scrolled()).toBe(true);
	});
});
