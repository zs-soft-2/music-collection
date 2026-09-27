import { firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ArtistDataService,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistModel,
	ArtistUtilService,
	CountryEnum,
	EntityTypeEnum,
} from '@music-collection/api';

import { OwnedArtistEffect } from './owned-artist.effect';
import { OwnedArtistStateService } from './owned-artist-state.service';

const model = (fields: Partial<ArtistModel> = {}): ArtistModel =>
	({
		uid: 'a1',
		entityType: EntityTypeEnum.Artist,
		name: 'Pozvakowski',
		country: CountryEnum.Hungary,
		formedIn: '1996-01-01T00:00:00.000Z',
		...fields,
	}) as ArtistModel;

/** The form hands over an entity, with a real date on it. */
const entity = (fields: Partial<ArtistEntityAdd> = {}): ArtistEntityAdd =>
	({
		entityType: EntityTypeEnum.Artist,
		name: 'Pozvakowski',
		country: CountryEnum.Hungary,
		formedIn: new Date('1996-01-01T00:00:00.000Z'),
		...fields,
	}) as ArtistEntityAdd;

interface FakeEffect {
	add$: jest.Mock;
	list$: jest.Mock;
	remove$: jest.Mock;
	update$: jest.Mock;
}

function setUp(artists: ArtistModel[] = [model()]): {
	effect: FakeEffect;
	service: OwnedArtistStateService;
} {
	const effect: FakeEffect = {
		add$: jest.fn((artist) => of(artist)),
		list$: jest.fn(() => of(artists)),
		remove$: jest.fn((artist) => of(artist)),
		update$: jest.fn((artist) => of(artist)),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			OwnedArtistStateService,
			{ provide: OwnedArtistEffect, useValue: effect },
			{
				provide: ArtistUtilService,
				useValue: {
					convertEntityAddToModelAdd: (one: ArtistEntityAdd) => ({
						...one,
						formedIn: one.formedIn?.toISOString() ?? null,
						searchParameters: [],
					}),
					convertEntityToModel: (one: ArtistEntity) => ({
						...one,
						formedIn: one.formedIn?.toISOString() ?? null,
						searchParameters: [],
					}),
					convertEntityUpdateToModelUpdate: (one: object) => one,
					convertModelToEntity: (one: ArtistModel) => ({
						...one,
						formedIn: one.formedIn ? new Date(one.formedIn) : null,
					}),
				},
			},
			{ provide: ArtistDataService, useValue: {} },
		],
	});

	return { effect, service: TestBed.inject(OwnedArtistStateService) };
}

describe('OwnedArtistStateService: the form writes to the collector', () => {
	it('adds the band the form built, as the catalog stores it', () => {
		const { effect, service } = setUp();

		service.dispatchAddEntityAction(entity());

		expect(effect.add$).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Pozvakowski',
				formedIn: '1996-01-01T00:00:00.000Z',
			})
		);
	});

	it('keeps a refused write, so the list can say so', () => {
		const { effect, service } = setUp();

		effect.add$.mockReturnValue(
			throwError(() => new Error('permission-denied'))
		);
		service.dispatchAddEntityAction(entity());

		expect(service.lastError()).toBe('permission-denied');
	});

	it('forgets the last error when the next write starts', () => {
		const { effect, service } = setUp();

		effect.add$.mockReturnValue(throwError(() => new Error('denied')));
		service.dispatchAddEntityAction(entity());
		effect.add$.mockReturnValue(of(model()));
		service.dispatchAddEntityAction(entity());

		expect(service.lastError()).toBeNull();
	});
});

describe('OwnedArtistStateService: what the form reads', () => {
	it('answers with the collector own bands, not the catalog', async () => {
		const { service } = setUp();

		await expect(
			firstValueFrom(service.selectEntities$())
		).resolves.toMatchObject([{ uid: 'a1', name: 'Pozvakowski' }]);
	});

	it('hands the date back as a date, the way the form wants it', async () => {
		const { service } = setUp();
		const [artist] = await firstValueFrom(service.selectEntities$());

		expect(artist.formedIn).toBeInstanceOf(Date);
	});

	it('finds the band being edited', async () => {
		const { service } = setUp();

		await expect(
			firstValueFrom(service.selectEntityById$('a1'))
		).resolves.toMatchObject({ name: 'Pozvakowski' });
	});

	it('answers a new band with nothing, the way `edit/0` asks', async () => {
		const { service } = setUp();

		await expect(
			firstValueFrom(service.selectEntityById$('0'))
		).resolves.toBeUndefined();
	});
});
