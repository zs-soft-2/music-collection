import { firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AnalyticsService,
	ArtistModel,
	ArtistModelAdd,
	CountryEnum,
	EntityTypeEnum,
} from '@music-collection/api';

import { OwnedArtistEffect } from './owned-artist.effect';
import { OwnedArtistRepository } from './owned-artist.repository';

const held = (fields: Partial<ArtistModel> = {}): ArtistModel =>
	({
		uid: 'a1',
		entityType: EntityTypeEnum.Artist,
		name: 'Pozvakowski',
		country: CountryEnum.Hungary,
		...fields,
	}) as ArtistModel;

interface FakeRepository {
	add$: jest.Mock;
	delete$: jest.Mock;
	list$: jest.Mock;
	update$: jest.Mock;
}

function setUp(existing: ArtistModel[] = []): {
	effect: OwnedArtistEffect;
	repository: FakeRepository;
	tracked: jest.Mock;
} {
	const repository: FakeRepository = {
		add$: jest.fn((artist) => of({ ...artist, uid: 'new' })),
		delete$: jest.fn((artist) => of(artist)),
		list$: jest.fn(() => of(existing)),
		update$: jest.fn((artist) => of(artist)),
	};
	const tracked = jest.fn();

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			OwnedArtistEffect,
			{ provide: OwnedArtistRepository, useValue: repository },
			{ provide: AnalyticsService, useValue: { track: tracked } },
		],
	});

	return { effect: TestBed.inject(OwnedArtistEffect), repository, tracked };
}

describe('OwnedArtistEffect', () => {
	it('hands the bands over by name', async () => {
		const { effect } = setUp([
			held({ uid: 'a1', name: 'Pozvakowski' }),
			held({ uid: 'a2', name: 'Amon Amarth' }),
		]);

		await expect(firstValueFrom(effect.list$())).resolves.toMatchObject([
			{ name: 'Amon Amarth' },
			{ uid: 'a1' },
		]);
	});

	it('writes the band as the form built it', async () => {
		const { effect, repository } = setUp();
		const band = { name: 'Pozvakowski' } as ArtistModelAdd;

		await firstValueFrom(effect.add$(band));

		expect(repository.add$).toHaveBeenCalledWith(band);
	});

	it('counts a band only once it is written', async () => {
		const { effect, repository, tracked } = setUp();

		repository.add$.mockReturnValue(throwError(() => new Error('nope')));

		await expect(
			firstValueFrom(
				effect.add$({ name: 'Pozvakowski' } as ArtistModelAdd)
			)
		).rejects.toThrow();
		expect(tracked).not.toHaveBeenCalled();
	});

	it('counts a band that is written', async () => {
		const { effect, tracked } = setUp();

		await firstValueFrom(
			effect.add$({ name: 'Pozvakowski' } as ArtistModelAdd)
		);

		expect(tracked).toHaveBeenCalledWith('owned_artist_added');
	});

	it('lets a band go', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(effect.remove$(held()));

		expect(repository.delete$).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'a1' })
		);
	});
});
