import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import {
	genreOf,
	provideGenreTesting,
} from '@music-collection/domain/genre/testing';
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

const artist = { uid: '1', name: 'Nirvana', genre: 'Rock' } as ArtistEntity;
/** What a Discogs credit import leaves behind: a name and no genre. */
const credited = { uid: '2', name: 'Fate' } as ArtistEntity;

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
				...provideGenreTesting([genreOf('Rock')]),
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

	/** Nothing to find, so nothing is offered. */
	it('offers no narrowing while every artist has a genre', () => {
		expect(
			fixture.nativeElement.querySelector('.mc-incomplete-filter')
		).toBeNull();
	});
});

describe('ArtistTableComponent: the artists without a genre', () => {
	let component: ArtistTableComponent;
	let fixture: ComponentFixture<ArtistTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [ArtistTableComponent],
			providers: [
				provideI18nTesting(),
				...provideGenreTesting([genreOf('Rock')]),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([artist, credited])),
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

	const button = (): HTMLButtonElement =>
		fixture.nativeElement.querySelector('.mc-incomplete-filter');

	it('counts them on a button of its own', () => {
		expect(button()).not.toBeNull();
		expect(button().textContent).toContain('1');
		expect(button().getAttribute('aria-pressed')).toBe('false');
	});

	it('narrows the table to them when it is pressed', () => {
		button().click();
		fixture.detectChanges();

		const rows = fixture.nativeElement.querySelector('tbody').textContent;

		expect(rows).toContain('Fate');
		expect(rows).not.toContain('Nirvana');
		expect(button().getAttribute('aria-pressed')).toBe('true');
	});

	it('shows everybody again when it is released', () => {
		button().click();
		fixture.detectChanges();
		button().click();
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Nirvana');
	});

	/** The one the enum left behind reads as missing, not as a genre. */
	it('says so in the row of an artist with no genre', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('no genre');
	});
});
