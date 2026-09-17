import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	ArtistUtilService,
	ExportImportService,
} from '@music-collection/api';

import { ArtistListPageComponent } from './artist-list-page.component';

describe('ArtistListComponent', () => {
	let component: ArtistListPageComponent;
	let fixture: ComponentFixture<ArtistListPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistListPageComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: ArtistUtilService, useValue: {} },
				{ provide: ExportImportService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
