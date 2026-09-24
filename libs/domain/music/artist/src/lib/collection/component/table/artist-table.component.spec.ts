import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ArtistEntity,
	ArtistStateService,
	ArtistUtilService,
	ExportImportService,
} from '@music-collection/api';

import { ArtistTableComponent } from './artist-table.component';

const artist = { uid: '1', name: 'Nirvana' } as ArtistEntity;

describe('ArtistTableComponent', () => {
	let component: ArtistTableComponent;
	let fixture: ComponentFixture<ArtistTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [ArtistTableComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([artist])),
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

	it('shows the artist in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Nirvana');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('Nirvana');
	});
});
