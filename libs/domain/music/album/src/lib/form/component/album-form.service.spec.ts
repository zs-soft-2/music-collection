import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	AlbumEntity,
	AlbumFormParams,
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
	DocumentStateService,
} from '@music-collection/api';

import { AlbumFormService } from './album-form.service';

const artist = { name: 'Arch Enemy', uid: 'artist-1' };

const albumOf = (uid: string, name: string) =>
	({ artist, name, uid }) as unknown as AlbumEntity;

const createFormGroup = (album: AlbumEntity | undefined) =>
	new FormGroup({
		artist: new FormControl(album?.artist ?? artist),
		name: new FormControl(album?.name ?? ''),
	});

function setup(
	catalog: AlbumEntity[],
	edited: AlbumEntity | undefined
): AlbumFormService {
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			AlbumFormService,
			provideRouter([]),
			{
				provide: AlbumStateService,
				useValue: {
					selectEntities$: jest.fn(() => of(catalog)),
					dispatchListEntitiesAction: jest.fn(),
					selectEntityById$: jest.fn(() => of(edited)),
				},
			},
			{
				provide: AlbumUtilService,
				useValue: { createFormGroup: jest.fn(createFormGroup) },
			},
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
	});

	return TestBed.inject(AlbumFormService);
}

const start = (service: AlbumFormService): AlbumFormParams => {
	let params!: AlbumFormParams;

	service.init$().subscribe((value) => (params = value));

	return params;
};

describe('AlbumFormService', () => {
	it('should be created', () => {
		expect(setup([], undefined)).toBeTruthy();
	});

	describe('a title the artist already carries twice', () => {
		const edited = albumOf('album-1', 'Burning Bridges');
		// The Discogs import filed the same record a second time.
		const twin = albumOf('album-2', 'Burning Bridges (2)');

		it('names the twin without refusing the album', () => {
			const service = setup([edited, twin], edited);
			const params = start(service);

			expect(service.duplicate()).toEqual({
				blocking: false,
				name: 'Burning Bridges (2)',
				uid: 'album-2',
			});
			// Refusing it would lock the album out of every other edit.
			expect(params.formGroup.valid).toBe(true);
		});

		it('refuses a title typed into another clash', () => {
			const service = setup(
				[edited, twin, albumOf('album-3', 'Wages of Sin')],
				edited
			);
			const params = start(service);

			params.formGroup.controls['name'].setValue('The Wages Of Sin');

			expect(service.duplicate()).toEqual({
				blocking: true,
				name: 'Wages of Sin',
				uid: 'album-3',
			});
			expect(params.formGroup.valid).toBe(false);
		});
	});

	it('leaves a title the artist does not carry alone', () => {
		const edited = albumOf('album-1', 'Burning Bridges');
		const service = setup([edited, albumOf('album-2', 'Doomsday')], edited);

		start(service);

		expect(service.duplicate()).toBeNull();
	});
});
