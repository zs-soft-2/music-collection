import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
} from '@music-collection/api';

import { AlbumTableComponent } from './album-table.component';

describe('AlbumTableComponent', () => {
	let component: AlbumTableComponent;
	let fixture: ComponentFixture<AlbumTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumTableComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: AlbumStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: AlbumUtilService, useValue: {} },
				{ provide: ArtistStateService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
