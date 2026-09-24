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

const album = {
	uid: '1',
	name: 'Nevermind',
	artist: { name: 'Nirvana' },
} as AlbumEntity;

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
					useValue: {
						selectEntities$: jest.fn(() => of([album])),
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

	it('offers a way to look at the album, not only to edit it', () => {
		expect(
			fixture.nativeElement
				.querySelector('tbody mc-view-action a')
				.getAttribute('href')
		).toBe('/album/1');
	});
});
