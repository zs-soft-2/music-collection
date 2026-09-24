import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ArtistEntity,
	ArtistExternalAlbum,
	ArtistExternalCandidate,
	ArtistStateService,
	ArtistUtilService,
	FormatEnum,
} from '@music-collection/api';

import { ArtistAlbumsService } from './artist-albums.service';

const artistOf = (partial: Partial<ArtistEntity> = {}) =>
	({
		name: 'Pariah',
		uid: 'artist-1',
		...partial,
	}) as unknown as ArtistEntity;

const candidateOf = (musicBrainzId: string): ArtistExternalCandidate => ({
	country: null,
	formedIn: null,
	musicBrainzId,
	name: 'Pariah',
	note: null,
	sourceUrl: `https://musicbrainz.org/artist/${musicBrainzId}`,
	styles: [],
	type: 'Group',
});

const albumOf = (name: string): ArtistExternalAlbum => ({
	format: FormatEnum.lp,
	name,
	sourceUrl: `https://musicbrainz.org/release-group/${name}`,
	year: new Date(1989, 0, 1),
});

let fetchExternalAlbums$: jest.Mock;
let searchExternalArtists$: jest.Mock;

function setup(
	artist: ArtistEntity,
	candidates: ArtistExternalCandidate[] = [],
	albums: ArtistExternalAlbum[] = [albumOf('The Kindred')]
): ArtistAlbumsService {
	fetchExternalAlbums$ = jest.fn(() => of(albums));
	searchExternalArtists$ = jest.fn(() => of(candidates));

	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			ArtistAlbumsService,
			{
				provide: ArtistStateService,
				useValue: {
					dispatchListAlbumsByIdAction: jest.fn(),
					fetchExternalAlbums$,
					searchExternalArtists$,
					selectAlbumsById$: jest.fn(() => of([])),
					selectEntityById$: jest.fn(() => of(artist)),
				},
			},
			{ provide: ArtistUtilService, useValue: {} },
		],
	});

	const service = TestBed.inject(ArtistAlbumsService);
	service.init$(artist.uid).subscribe();

	return service;
}

describe('ArtistAlbumsService', () => {
	it('asks which namesake the albums belong to', async () => {
		const service = setup(artistOf(), [
			candidateOf('uk-id'),
			candidateOf('us-id'),
		]);

		await service.loadExternal();

		expect(service.externalCandidates()).toHaveLength(2);
		// The albums of a namesake would land in the catalog unnoticed.
		expect(fetchExternalAlbums$).not.toHaveBeenCalled();
	});

	it('loads the albums of the namesake picked', async () => {
		const service = setup(artistOf(), [
			candidateOf('uk-id'),
			candidateOf('us-id'),
		]);
		await service.loadExternal();

		await service.chooseExternalCandidate(service.externalCandidates()![1]);

		expect(fetchExternalAlbums$).toHaveBeenCalledWith(
			expect.objectContaining({ musicBrainzId: 'us-id' })
		);
		expect(service.externalAlbums()).toHaveLength(1);
		expect(service.externalSourceUrl()).toBe(
			'https://musicbrainz.org/artist/us-id'
		);
	});

	it('keeps the pick for the next load of the tab', async () => {
		const service = setup(artistOf(), [
			candidateOf('uk-id'),
			candidateOf('us-id'),
		]);
		await service.loadExternal();
		await service.chooseExternalCandidate(service.externalCandidates()![0]);

		await service.loadExternal();

		expect(searchExternalArtists$).toHaveBeenCalledTimes(1);
		expect(fetchExternalAlbums$).toHaveBeenLastCalledWith(
			expect.objectContaining({ musicBrainzId: 'uk-id' })
		);
	});

	it('asks nothing when the artist carries an id', async () => {
		const saved = '0889bf09-508e-4335-ac27-65caf25aae5f';
		const service = setup(artistOf({ musicBrainzId: saved }));

		await service.loadExternal();

		expect(searchExternalArtists$).not.toHaveBeenCalled();
		expect(fetchExternalAlbums$).toHaveBeenCalledWith(
			expect.objectContaining({ musicBrainzId: saved })
		);
	});
});
