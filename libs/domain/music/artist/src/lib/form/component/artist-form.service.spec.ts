import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	ArtistEntity,
	ArtistExternalCandidate,
	ArtistExternalProfile,
	ArtistFormParams,
	ArtistStateService,
	ArtistUtilService,
	DocumentStateService,
	StyleEnum,
} from '@music-collection/api';

import { ArtistFormService } from './artist-form.service';

const artistOf = (uid: string, name: string) =>
	({ name, uid }) as unknown as ArtistEntity;

const createFormGroup = (artist: ArtistEntity | undefined) =>
	new FormGroup({
		country: new FormControl(null),
		musicBrainzId: new FormControl(artist?.musicBrainzId ?? ''),
		name: new FormControl(artist?.name ?? ''),
		styles: new FormControl([]),
	});

/** What the online lookup answers with in a test. */
interface ExternalStub {
	candidates?: ArtistExternalCandidate[];
	profile?: ArtistExternalProfile | null;
}

const candidateOf = (
	musicBrainzId: string,
	partial: Partial<ArtistExternalCandidate> = {}
): ArtistExternalCandidate => ({
	country: null,
	formedIn: null,
	musicBrainzId,
	name: 'Pariah',
	note: null,
	sourceUrl: `https://musicbrainz.org/artist/${musicBrainzId}`,
	styles: [],
	type: 'Group',
	...partial,
});

const profileOf = (musicBrainzId: string): ArtistExternalProfile => ({
	artistType: 'band',
	country: null,
	description: null,
	formedIn: null,
	imageUrl: null,
	musicBrainzId,
	name: 'Pariah',
	sourceUrl: `https://musicbrainz.org/artist/${musicBrainzId}`,
	styles: [],
});

let searchExternalArtists$: jest.Mock;
let fetchExternalProfile$: jest.Mock;

function setup(
	catalog: ArtistEntity[],
	edited: ArtistEntity | undefined,
	external: ExternalStub = {}
): ArtistFormService {
	searchExternalArtists$ = jest.fn(() => of(external.candidates ?? []));
	fetchExternalProfile$ = jest.fn(() => of(external.profile ?? null));
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			ArtistFormService,
			provideRouter([]),
			{
				provide: ArtistStateService,
				useValue: {
					selectEntities$: jest.fn(() => of(catalog)),
					dispatchListEntitiesAction: jest.fn(),
					fetchExternalProfile$,
					searchExternalArtists$,
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
	describe('loading the artist from MusicBrainz', () => {
		const edited = artistOf('artist-1', 'Pariah');

		it('asks which namesake this is instead of guessing', async () => {
			const service = setup([edited], edited, {
				candidates: [
					candidateOf('uk-id', { note: 'UK thrash metal band' }),
					candidateOf('us-id', { note: 'US heavy metal band' }),
				],
			});
			start(service);

			await service.loadExternal();

			expect(service.externalCandidates()).toEqual([
				expect.objectContaining({ musicBrainzId: 'uk-id' }),
				expect.objectContaining({ musicBrainzId: 'us-id' }),
			]);
			// Nothing is loaded until the admin says which artist theirs is.
			expect(fetchExternalProfile$).not.toHaveBeenCalled();
			expect(service.externalComparison()).toBeNull();
		});

		it('names what tells the namesakes apart', async () => {
			const service = setup([edited], edited, {
				candidates: [
					candidateOf('uk-id', {
						country: 'UK',
						formedIn: new Date(1988, 0, 1),
						styles: [StyleEnum.Thrash],
					}),
					candidateOf('us-id'),
				],
			});
			start(service);

			await service.loadExternal();

			expect(service.externalCandidates()?.[0].details).toBe(
				'Group · UK · 1988 · Thrash'
			);
		});

		it('loads the only artist of the name without asking', async () => {
			const service = setup([edited], edited, {
				candidates: [candidateOf('uk-id')],
				profile: profileOf('uk-id'),
			});
			start(service);

			await service.loadExternal();

			expect(service.externalCandidates()).toBeNull();
			expect(fetchExternalProfile$).toHaveBeenCalledWith(
				expect.objectContaining({ musicBrainzId: 'uk-id' })
			);
			expect(service.externalComparison()?.sourceUrl).toContain('uk-id');
		});

		it('loads the namesake the admin picked', async () => {
			const service = setup([edited], edited, {
				candidates: [candidateOf('uk-id'), candidateOf('us-id')],
				profile: profileOf('us-id'),
			});
			start(service);
			await service.loadExternal();

			await service.chooseExternalCandidate(
				service.externalCandidates()![1]
			);

			expect(service.externalCandidates()).toBeNull();
			expect(fetchExternalProfile$).toHaveBeenCalledWith(
				expect.objectContaining({ musicBrainzId: 'us-id' })
			);
			expect(service.externalComparison()?.sourceUrl).toContain('us-id');
		});

		it('asks nothing when the form already names the artist', async () => {
			const service = setup([edited], edited, {
				profile: profileOf('typed-id'),
			});
			const params = start(service);
			params.formGroup.controls['musicBrainzId'].setValue(
				'https://musicbrainz.org/artist/0889bf09-508e-4335-ac27-65caf25aae5f'
			);

			await service.loadExternal();

			expect(searchExternalArtists$).not.toHaveBeenCalled();
			expect(fetchExternalProfile$).toHaveBeenCalledWith(
				expect.objectContaining({
					musicBrainzId: '0889bf09-508e-4335-ac27-65caf25aae5f',
				})
			);
		});

		it('says so when the name is found nowhere', async () => {
			const service = setup([edited], edited);
			start(service);

			await service.loadExternal();

			expect(service.externalError()).toBe(
				'No artist found for "Pariah".'
			);
		});
	});
});
