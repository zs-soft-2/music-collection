import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Crumb } from '../page-breadcrumb/crumb';

import { NavigationHistoryService } from './navigation-history.service';
import { PageBackComponent } from './page-back.component';

describe('PageBackComponent', () => {
	let fixture: ComponentFixture<PageBackComponent>;
	let canGoBack: ReturnType<typeof signal<boolean>>;
	let back: jest.Mock;
	let navigate: jest.Mock;

	const render = (fallback: Crumb | null): HTMLElement => {
		fixture.componentRef.setInput('fallback', fallback);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	const button = (): HTMLButtonElement | null =>
		(fixture.nativeElement as HTMLElement).querySelector('button');

	beforeEach(() => {
		canGoBack = signal(false);
		back = jest.fn(() => canGoBack());
		navigate = jest.fn();

		TestBed.configureTestingModule({
			imports: [PageBackComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: NavigationHistoryService,
					useValue: { canGoBack, back },
				},
			],
		});
		TestBed.overrideProvider(Router, {
			useValue: { navigate, events: { pipe: () => ({}) } },
		});

		fixture = TestBed.createComponent(PageBackComponent);
	});

	it('goes back to the page the reader came from', () => {
		canGoBack.set(true);
		render({ label: 'Amorphis', link: ['/artist', 'a1'] });
		button()?.click();

		expect(back).toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});

	it('falls back on the page above when a link opened this one', () => {
		render({ label: 'Amorphis', link: ['/artist', 'a1'] });
		button()?.click();

		expect(navigate).toHaveBeenCalledWith(['/artist', 'a1'], {
			queryParams: undefined,
		});
	});

	it('carries the parent its own query, so a list comes back as it was', () => {
		render({
			label: 'Bay Area Thrash',
			link: '/collections/bay-area',
			queryParams: { filter: 'owned' },
		});
		button()?.click();

		expect(navigate).toHaveBeenCalledWith(['/collections/bay-area'], {
			queryParams: { filter: 'owned' },
		});
	});

	it('is not shown where there is neither a visit nor a page above', () => {
		render(null);

		expect(button()).toBeNull();
	});

	it('is shown on a page with a visit behind it and nothing above', () => {
		canGoBack.set(true);
		render(null);

		expect(button()).not.toBeNull();
	});

	it('says what it goes back to when the page knows', () => {
		canGoBack.set(true);
		fixture.componentRef.setInput('label', 'Bay Area Thrash');
		render(null);

		expect(button()?.textContent?.trim()).toBe('Bay Area Thrash');
	});
});
