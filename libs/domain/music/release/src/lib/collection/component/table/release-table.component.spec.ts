import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ReleaseEntity,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { provideReleaseDeletionTesting } from '../../../deletion/release-deletion.testing';

import { ReleaseTableComponent } from './release-table.component';

const release = {
	uid: '1',
	name: 'Nevermind LP',
	artist: { name: 'Nirvana' },
} as ReleaseEntity;

describe('ReleaseTableComponent', () => {
	let component: ReleaseTableComponent;
	let fixture: ComponentFixture<ReleaseTableComponent>;
	let releaseStateService: {
		selectEntities$: jest.Mock;
		selectSearchResult$: jest.Mock;
		dispatchSearch: jest.Mock;
		dispatchSearchByArtistName: jest.Mock;
	};

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		releaseStateService = {
			selectEntities$: jest.fn(() => of([release])),
			selectSearchResult$: jest.fn(() => of([])),
			dispatchSearch: jest.fn(),
			dispatchSearchByArtistName: jest.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [ReleaseTableComponent],
			providers: [
				provideI18nTesting(),
				...provideReleaseDeletionTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{ provide: ReleaseStateService, useValue: releaseStateService },
				{
					provide: ReleaseUtilService,
					useValue: { createSearchParams: jest.fn(() => []) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('shows the release in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Nevermind LP');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('Nevermind LP');
	});

	it('searches by artist and empties the name search', () => {
		component.searchByNameHandler({ query: 'never' });
		component.searchByArtistNameHandler({ query: 'nirv' });

		expect(
			releaseStateService.dispatchSearchByArtistName
		).toHaveBeenCalledWith('nirv');
		expect(component.place.filterOf('name')).toBe('');
		expect(component.place.filterOf('artist')).toBe('nirv');
	});

	it('leaves the artist search on when the empty name box is cleared', () => {
		component.searchByArtistNameHandler({ query: 'nirv' });
		component.clearNameSearch();

		expect(component.place.filterOf('artist')).toBe('nirv');
	});
});
