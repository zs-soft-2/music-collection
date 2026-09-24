import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
	DocumentStateService,
} from '@music-collection/api';

import { AlbumUtilServiceImpl } from '../../util/service/album-util.service.impl';
import { AlbumFormComponent } from './album-form.component';

describe('AlbumFormComponent', () => {
	let component: AlbumFormComponent;
	let fixture: ComponentFixture<AlbumFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumFormComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: AlbumStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectEntityById$: jest.fn(() => of(undefined)),
					},
				},
				{ provide: AlbumUtilService, useClass: AlbumUtilServiceImpl },
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
