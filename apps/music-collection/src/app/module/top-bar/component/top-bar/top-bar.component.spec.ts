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

import { ExternalPlayerConsentService } from '../../../../data/external-player';
import { PlayerStore } from '../../../../shared/player';
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
});
