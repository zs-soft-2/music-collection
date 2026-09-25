import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { NgxPermissionsModule } from 'ngx-permissions';
import { of } from 'rxjs';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AuthenticationStateService,
	AuthorizationService,
	EntityQuantityStateService,
} from '@music-collection/api';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { AppComponent } from './app.component';
import { MeasurementConsentService } from './data/analytics';
import { DailyQuestionEffect } from './data/daily-question';
import { ExternalPlayerConsentService } from './data/external-player';
import { PlayerStore } from './shared/player';

describe('AppComponent', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				AppComponent,
				NgxPermissionsModule.forRoot(),
				// A CoreErrorModule feature-store-ot és -effecteket regisztrál, ezekhez kell a gyökér.
				StoreModule.forRoot({}),
				EffectsModule.forRoot([]),
			],
			providers: [
				provideRouter([]),
				provideI18nTesting(),
				{
					provide: AuthenticationStateService,
					useValue: {
						dispatchLogin: jest.fn(),
						dispatchLogout: jest.fn(),
						selectAuthenticatedUser$: () => of(undefined),
						selectIsAuthenticated$: () => of(false),
					},
				},
				{
					provide: EntityQuantityStateService,
					useValue: { dispatchListEntitiesAction: jest.fn() },
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
					// A hozzájárulás a beállításokból jönne (Firestore/Auth);
					// itt elég annyi, hogy a sáv ne kérdezzen semmit.
					provide: MeasurementConsentService,
					useValue: { consented: signal(false), decide: jest.fn() },
				},
				{
					provide: ExternalPlayerConsentService,
					useValue: {
						consented: signal(false),
						allowed: signal(false),
						asking: signal(false),
						decide: jest.fn(),
					},
				},
				{
					// A napi kérdés sávja a játék adataiból élne (Firestore);
					// itt elég annyi, hogy ne legyen kérdés, tehát ne is
					// szóljon róla.
					provide: DailyQuestionEffect,
					useValue: {
						today: () => '2026-09-25',
						uid$: () => of(null),
						question$: () => of(null),
						answer$: () => of(null),
						isDismissed: () => false,
						dismiss: jest.fn(),
					},
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

	it('should create the app', () => {
		const fixture = TestBed.createComponent(AppComponent);

		fixture.detectChanges();

		expect(fixture.componentInstance).toBeTruthy();
	});
});
