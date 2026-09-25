import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { NgxPermissionsModule } from 'ngx-permissions';
import { BehaviorSubject, of } from 'rxjs';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AuthenticationStateService,
	AuthorizationService,
} from '@music-collection/api';

import { ExternalPlayerConsentService } from '../../../../data/external-player';
import { PlayerStore } from '../../../../shared/player';
import { TopBarComponent } from './top-bar.component';

describe('TopBarComponent', () => {
	let component: TopBarComponent;
	let fixture: ComponentFixture<TopBarComponent>;
	let isAuthenticated$: BehaviorSubject<boolean>;

	const labels = (selector: string): string[] =>
		Array.from(fixture.nativeElement.querySelectorAll(selector)).map(
			(item) => (item as HTMLElement).textContent?.trim() ?? ''
		);

	/** The labels of the links on the bar itself, in order. */
	const navLabels = (): string[] => labels('.nav .nav-link');

	const openAccount = (): void => {
		fixture.nativeElement.querySelector('.avatar-btn').click();
		fixture.detectChanges();
	};

	/** The labels under the avatar, links and buttons alike, in order. */
	const accountLabels = (): string[] => {
		openAccount();

		return labels('.menu .menu-item');
	};

	/** The labels on the sheet the hamburger opens, in order. */
	const sheetLabels = (): string[] => {
		fixture.nativeElement.querySelector('.menu-toggle').click();
		fixture.detectChanges();

		return labels('.sheet .sheet-link');
	};

	beforeEach(async () => {
		isAuthenticated$ = new BehaviorSubject(false);

		await TestBed.configureTestingModule({
			imports: [TopBarComponent, NgxPermissionsModule.forRoot()],
			providers: [
				provideRouter([]),
				provideI18nTesting(),
				{
					// A külső lejátszók hozzájárulása a beállításokból jönne
					// (Firestore/Auth); itt elég, hogy a mini player kimarad.
					provide: ExternalPlayerConsentService,
					useValue: {
						consented: signal(false),
						allowed: signal(false),
						asking: signal(false),
						decide: jest.fn(),
					},
				},
				{
					provide: AuthenticationStateService,
					useValue: {
						dispatchLogin: jest.fn(),
						dispatchLogout: jest.fn(),
						selectAuthenticatedUser$: () => of(undefined),
						selectIsAuthenticated$: () => isAuthenticated$,
					},
				},
				{
					provide: AuthorizationService,
					useValue: { removeAll: jest.fn() },
				},
				{
					provide: AlbumStateService,
					useValue: { selectEntities$: () => of([]) },
				},
				{
					provide: PlayerStore,
					useValue: {
						stageOpen: signal(false),
						now: signal(null),
					},
				},
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TopBarComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	/**
	 * A guest is offered what there is to browse. The rest would only ever be
	 * empty for them, or asks for a collection they have not got.
	 */
	it('keeps the personal links from a guest', () => {
		expect(navLabels()).toEqual([
			'Home',
			'Collections',
			'Coming out',
			'Network',
		]);
	});

	/**
	 * The bar used to gain six links the moment a session was restored, which
	 * moved every link already on it. It now says the same thing either way.
	 */
	it('leaves the bar as it is once the session is restored', () => {
		isAuthenticated$.next(true);
		fixture.detectChanges();

		expect(navLabels()).toEqual([
			'Home',
			'Collections',
			'Coming out',
			'Network',
		]);
	});

	it('offers the collector their own pages under the avatar', () => {
		isAuthenticated$.next(true);
		fixture.detectChanges();

		expect(accountLabels()).toEqual([
			'My Collection',
			'Scan',
			'Shelf',
			'Radio',
			'Daily question',
			'Wishlist',
			'Map',
			'Profile',
			'Log out',
		]);
	});

	/**
	 * On a phone the sheet already carries these at full width, so the
	 * stylesheet leaves them out of the menu. The class is what it holds on
	 * to, and jsdom applies no media query — hence the class, not the count.
	 */
	it('marks the pages the phone stylesheet drops from the menu', () => {
		isAuthenticated$.next(true);
		fixture.detectChanges();
		openAccount();

		expect(labels('.menu .collector')).toEqual([
			'My Collection',
			'Scan',
			'Shelf',
			'Radio',
			'Daily question',
			'Wishlist',
			'Map',
		]);
	});

	/** On a phone there is a screen to fill and no avatar to hide behind. */
	it('keeps every page one tap deep on the sheet', () => {
		isAuthenticated$.next(true);
		fixture.detectChanges();

		expect(sheetLabels()).toEqual([
			'Home',
			'My Collection',
			'Scan',
			'Shelf',
			'Collections',
			'Radio',
			'Daily question',
			'Coming out',
			'Wishlist',
			'Network',
			'Map',
		]);
	});
});
