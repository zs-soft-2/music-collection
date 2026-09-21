import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	ArtistEntity,
	ArtistFormParams,
	ArtistStateService,
	ArtistUtilService,
	DocumentStateService,
} from '@music-collection/api';

import { ArtistFormService } from './artist-form.service';

const artistOf = (uid: string, name: string) =>
	({ name, uid }) as unknown as ArtistEntity;

const createFormGroup = (artist: ArtistEntity | undefined) =>
	new FormGroup({ name: new FormControl(artist?.name ?? '') });

function setup(
	catalog: ArtistEntity[],
	edited: ArtistEntity | undefined
): ArtistFormService {
	TestBed.configureTestingModule({
		providers: [
			ArtistFormService,
			provideRouter([]),
			{
				provide: ArtistStateService,
				useValue: {
					selectEntities$: jest.fn(() => of(catalog)),
					dispatchListEntitiesAction: jest.fn(),
					selectEntityById$: jest.fn(() => of(edited)),
				},
			},
			{
				provide: ArtistUtilService,
				useValue: { createFormGroup: jest.fn(createFormGroup) },
			},
			{
				provide: DocumentStateService,
				useValue: { selectSearchResult$: jest.fn(() => of([])) },
			},
		],
	});

	return TestBed.inject(ArtistFormService);
}

const start = (service: ArtistFormService): ArtistFormParams => {
	let params!: ArtistFormParams;

	service.init$().subscribe((value) => (params = value));

	return params;
};

describe('ArtistFormService', () => {
	it('should be created', () => {
		expect(setup([], undefined)).toBeTruthy();
	});

	describe('a name the catalog already carries twice', () => {
		const edited = artistOf('artist-1', 'Testament');
		// The Discogs import filed the same act a second time.
		const twin = artistOf('artist-2', 'Testament (2)');

		it('names the twin without refusing the artist', () => {
			const service = setup([edited, twin], edited);
			const params = start(service);

			expect(service.duplicate()).toEqual({
				blocking: false,
				name: 'Testament (2)',
				uid: 'artist-2',
			});
			// Refusing it would lock the artist out of every other edit.
			expect(params.formGroup.valid).toBe(true);
		});

		it('refuses a name typed into another clash', () => {
			const service = setup(
				[edited, twin, artistOf('artist-3', 'Forbidden')],
				edited
			);
			const params = start(service);

			params.formGroup.controls['name'].setValue('The Forbidden');

			expect(service.duplicate()).toEqual({
				blocking: true,
				name: 'Forbidden',
				uid: 'artist-3',
			});
			expect(params.formGroup.valid).toBe(false);
		});
	});

	it('leaves a name the catalog does not carry alone', () => {
		const edited = artistOf('artist-1', 'Testament');
		const service = setup(
			[edited, artistOf('artist-2', 'Forbidden')],
			edited
		);

		start(service);

		expect(service.duplicate()).toBeNull();
	});
});
