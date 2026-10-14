import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
} from '@music-collection/api';

import { AlbumTableComponent } from './album-table.component';

/** An album nobody has written the tracklist of yet. */
const album = {
	uid: '1',
	name: 'Nevermind',
	artist: { name: 'Nirvana' },
	hasTracks: false,
} as AlbumEntity;

/** An album the tracklist of which the catalog does hold. */
const inUtero = {
	uid: '2',
	name: 'In Utero',
	artist: { name: 'Nirvana' },
	hasTracks: true,
} as AlbumEntity;

/** An album the script has not been over yet: nothing is known of it. */
const unchecked = {
	uid: '3',
	name: 'Bleach',
	artist: { name: 'Nirvana' },
} as AlbumEntity;

const albumState = {
	selectEntities$: jest.fn(() => of([album, inUtero, unchecked])),
	selectSearchResult$: jest.fn(() => of([])),
};

/** The names of the albums as the table lists them, in order. */
const rowNames = (fixture: ComponentFixture<AlbumTableComponent>): string[] =>
	[...fixture.nativeElement.querySelectorAll('tbody tr')].map((row) =>
		(row as HTMLElement).querySelector('td')?.textContent?.trim()
	) as string[];

describe('AlbumTableComponent', () => {
	let component: AlbumTableComponent;
	let fixture: ComponentFixture<AlbumTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [AlbumTableComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: AlbumStateService,
					useValue: albumState,
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

	it('shows the album in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Nevermind');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('Nevermind');
	});

	it('takes the albums with no tracklist to the front when sorted by it', () => {
		const tracks = fixture.nativeElement.querySelector('tbody').textContent;

		expect(tracks).toContain('No tracks');

		const header: HTMLElement = [
			...fixture.nativeElement.querySelectorAll('thead th'),
		].find((th) => (th as HTMLElement).textContent?.includes('Tracks'));

		header.click();
		fixture.detectChanges();

		// Up first: the record whose songs are still to be typed in.
		expect(component.place.sort()).toEqual([
			{ field: 'hasTracks', order: 1 },
		]);
		expect(rowNames(fixture)).toEqual([
			'Nevermind',
			'In Utero',
			// Last either way: an album nothing is known of is not an album
			// known to have no songs.
			'Bleach',
		]);

		// And the other way round, so it is the flag that orders them and
		// not the order they happened to arrive in.
		header.click();
		fixture.detectChanges();

		expect(rowNames(fixture)).toEqual(['In Utero', 'Nevermind', 'Bleach']);
	});

	it('does not call an album it knows nothing of empty', () => {
		const row = [
			...fixture.nativeElement.querySelectorAll('tbody tr'),
		].find((tr) =>
			(tr as HTMLElement).textContent?.includes('Bleach')
		) as HTMLElement;

		expect(row.textContent).toContain('Not checked');
		expect(row.textContent).not.toContain('No tracks');
	});

	it('offers a way to look at the album, not only to edit it', () => {
		expect(
			fixture.nativeElement
				.querySelector('tbody mc-view-action a')
				.getAttribute('href')
		).toBe('/album/1');
	});
});
