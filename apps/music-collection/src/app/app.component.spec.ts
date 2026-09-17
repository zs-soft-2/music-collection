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

import { AppComponent } from './app.component';
import { SpotifyPlaybackStore } from './shared/spotify';

describe('AppComponent', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AppComponent, NgxPermissionsModule.forRoot()],
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
					provide: SpotifyPlaybackStore,
					useValue: {
						connected: signal(false),
						nowPlaying: signal(null),
						volume: signal(0),
						volumeSupported: signal(false),
						setVolume: jest.fn(),
						skip: jest.fn(),
						togglePlay: jest.fn(),
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
