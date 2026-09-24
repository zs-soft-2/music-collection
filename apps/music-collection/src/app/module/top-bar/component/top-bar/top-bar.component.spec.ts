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

	/** The labels of the links the top bar offers, in order. */
	const navLabels = (): string[] =>
		Array.from(
			fixture.nativeElement.querySelectorAll('.nav .nav-link')
		).map((link) => (link as HTMLElement).textContent?.trim() ?? '');

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

	it('offers every link once the session is restored', () => {
		isAuthenticated$.next(true);
		fixture.detectChanges();

		expect(navLabels()).toEqual([
			'Home',
			'My Collection',
			'Scan',
			'Shelf',
			'Collections',
			'Radio',
			'Coming out',
			'Wishlist',
			'Network',
			'Map',
		]);
	});
});
