import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter,
} from '@angular/router';
import { AuthenticationStateService } from '@music-collection/api';
import { of } from 'rxjs';

import { CollectorProfileDocument } from '../../data/collector-profile';
import { CollectorProfileEffect } from '../../data/collector-profile';

import { CollectorPageComponent } from './collector-page.component';

const SHARED: CollectorProfileDocument = {
	uid: 'u1',
	displayName: 'Zsolt',
	numbers: {
		copies: 312,
		albums: 280,
		artists: 94,
		byFormat: { vinyl: 300, cd: 12 },
		oldestYear: 1971,
		since: 2019,
	},
	points: { total: 1240, completedCollections: 2 },
	badges: [
		{
			slug: 'bay-area',
			name: 'Thrash Historian',
			imageUrl: 'https://e.test/pin.png',
			points: 620,
		},
	],
	pursuits: [{ slug: 'doom', name: 'Doom', owned: 4, total: 10 }],
	showcase: [
		{
			title: 'Reign in Blood',
			artistName: 'Slayer',
			year: 1986,
			format: 'vinyl',
			coverUrl: 'https://e.test/reign.jpg',
			editions: ['limited edition'],
		},
	],
	wishlist: [
		{
			title: 'Peace Sells',
			artistName: 'Megadeth',
			coverUrl: 'https://e.test/peace.jpg',
			medias: [],
			sourceLink: 'https://shop.test/peace',
		},
	],
	updatedAt: Date.UTC(2026, 8, 20),
} as CollectorProfileDocument;

describe('CollectorPageComponent', () => {
	let fixture: ComponentFixture<CollectorPageComponent>;
	const login = jest.fn();

	/** Builds the page for one document — or for none shared at all. */
	/** The full shelf this page would find behind its button. */
	let albums: Record<string, unknown> | null = null;

	const render = (
		profile: CollectorProfileDocument | null,
		visitor: { uid: string } | null = null
	): HTMLElement => {
		TestBed.configureTestingModule({
			imports: [CollectorPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						paramMap: of(convertToParamMap({ uid: 'u1' })),
					},
				},
				{
					provide: CollectorProfileEffect,
					useValue: {
						profile$: () => of(profile),
						albums$: () => of(albums),
					},
				},
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: () => of(visitor),
						dispatchLogin: login,
					},
				},
			],
		});

		fixture = TestBed.createComponent(CollectorPageComponent);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(() => {
		login.mockClear();
		albums = null;
		TestBed.resetTestingModule();
	});

	it('draws the shelf of the collector the address names', () => {
		const host = render(SHARED);

		expect(host.querySelector('h1')?.textContent).toContain('Zsolt');
		expect(host.textContent).toContain('312');
		expect(host.textContent).toContain('1240');
		expect(host.querySelector('.covers b')?.textContent).toContain(
			'Reign in Blood'
		);
		expect(host.querySelector('.badge-grid b')?.textContent).toContain(
			'Thrash Historian'
		);
	});

	/** The bar is drawn from the owned/total of the document, not from a width. */
	it('draws how far a pursuit has got', () => {
		const host = render(SHARED);
		const bar = host.querySelector<HTMLElement>('.bar span');

		expect(bar?.style.width).toBe('40%');
	});

	/**
	 * A shop link is a stranger's address offered under our domain, so it
	 * leaves no referrer, grants the opened page nothing, and tells search
	 * engines it is not an endorsement.
	 */
	it('offers a shop link as the outside link it is', () => {
		const host = render(SHARED);
		const shop = host.querySelector<HTMLAnchorElement>('.shop');

		expect(shop?.getAttribute('href')).toBe('https://shop.test/peace');
		expect(shop?.getAttribute('target')).toBe('_blank');
		expect(shop?.getAttribute('rel')).toBe(
			'nofollow ugc noopener noreferrer'
		);
		expect(shop?.textContent).toContain('shop.test');
	});

	it('draws no picture for a cover that is not a web address', () => {
		const host = render({
			...SHARED,
			showcase: [
				{
					title: 'Reign in Blood',
					artistName: 'Slayer',
					year: 1986,
					format: 'vinyl',
					coverUrl: 'javascript:alert(1)',
					editions: [],
				},
			],
		} as CollectorProfileDocument);

		expect(host.querySelector('.covers img')).toBeNull();
		expect(host.querySelector('.covers .blank')).not.toBeNull();
	});

	/** The whole point of a public page: the visitor could have one too. */
	it('invites a signed-out visitor to start their own', () => {
		const host = render(SHARED);
		const call = host.querySelector<HTMLButtonElement>('.invite .call');

		call?.click();

		expect(login).toHaveBeenCalled();
	});

	it('tells the owner this is how others see it', () => {
		const host = render(SHARED, { uid: 'u1' });

		expect(host.querySelector('.invite .call')?.tagName).toBe('A');
		expect(host.querySelector('.invite button')).toBeNull();
	});

	it('says so where nothing is shared', () => {
		const host = render(null);

		expect(host.querySelector('.empty')).not.toBeNull();
		expect(host.querySelector('.hero')).toBeNull();
	});

	/**
	 * The window holds two dozen records; the rest is a second document, and
	 * a second read, so it waits for somebody to ask.
	 */
	describe('the rest of the shelf', () => {
		it('offers the whole shelf where the window is not all of it', () => {
			const host = render(SHARED);

			expect(host.querySelector('.shelf-all .more')).not.toBeNull();
			expect(host.querySelector('.all-list')).toBeNull();
		});

		it('reads it only once asked, and then lists it', () => {
			albums = {
				uid: 'u1',
				count: 2,
				albums: [
					{
						title: 'Powerslave',
						artistName: 'Iron Maiden',
						year: 1984,
						format: 'vinyl',
					},
					{
						title: 'Rust in Peace',
						artistName: 'Megadeth',
						year: 1990,
						format: 'cd',
					},
				],
			};

			const host = render(SHARED);

			host.querySelector<HTMLButtonElement>('.shelf-all .more')?.click();
			fixture.detectChanges();

			expect(host.querySelectorAll('.all-list li')).toHaveLength(2);
			expect(host.querySelector('.all-list b')?.textContent).toContain(
				'Powerslave'
			);
		});

		it('offers nothing more where the window already shows it all', () => {
			const host = render({
				...SHARED,
				numbers: { ...SHARED.numbers, copies: 1 },
			} as CollectorProfileDocument);

			expect(host.querySelector('.shelf-all')).toBeNull();
		});
	});
});
