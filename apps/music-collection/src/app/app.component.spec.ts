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
