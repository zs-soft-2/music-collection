import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	ArtistUtilService,
	ExportImportService,
} from '@music-collection/api';

import { ArtistTableComponent } from './artist-table.component';

describe('ArtistTableComponent', () => {
	let component: ArtistTableComponent;
	let fixture: ComponentFixture<ArtistTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistTableComponent],
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

		fixture = TestBed.createComponent(ArtistTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
