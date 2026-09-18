import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
} from '@music-collection/api';

import { AlbumListPageComponent } from './album-list-page.component';

describe('AlbumListComponent', () => {
	let component: AlbumListPageComponent;
	let fixture: ComponentFixture<AlbumListPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumListPageComponent],
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

		fixture = TestBed.createComponent(AlbumListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
