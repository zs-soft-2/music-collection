import { NgxPermissionsModule } from 'ngx-permissions';
import { of } from 'rxjs';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AuthenticationStateService,
	AuthorizationService,
} from '@music-collection/api';

import { SpotifyPlaybackStore } from '../../../../shared/spotify';
import { TopBarComponent } from './top-bar.component';

describe('TopBarComponent', () => {
	let component: TopBarComponent;
	let fixture: ComponentFixture<TopBarComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TopBarComponent, NgxPermissionsModule.forRoot()],
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

	beforeEach(() => {
		fixture = TestBed.createComponent(TopBarComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
