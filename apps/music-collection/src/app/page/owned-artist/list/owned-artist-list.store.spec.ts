import { NEVER, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ArtistModel,
	CountryEnum,
	EntityRequest,
	EntityTypeEnum,
} from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { OwnedArtistEffect } from '../../../data/owned-artist';
import { RequestEffect } from '../../../data/request';
import { OwnedArtistListStore } from './owned-artist-list.store';

const band = (fields: Partial<ArtistModel> = {}): ArtistModel =>
	({
		uid: 'a1',
		entityType: EntityTypeEnum.Artist,
		name: 'Pozvakowski',
		country: CountryEnum.Hungary,
		...fields,
	}) as ArtistModel;

interface FakeEffect {
	list$: jest.Mock;
	remove$: jest.Mock;
}

interface FakeRequestEffect {
	listMine$: jest.Mock;
	submitCreate$: jest.Mock;
}

const asked = (fields: Partial<EntityRequest> = {}): EntityRequest =>
	({
		uid: 'r1',
		userId: 'u1',
		operation: 'create',
		target: {
			featureKey: 'artist',
			entityType: EntityTypeEnum.Artist,
			path: null,
			parentPath: null,
			ownedPath: 'user/u1/owned-artist/a1',
		},
		status: 'pending',
		createdAt: 1,
		...fields,
	}) as EntityRequest;

function setUp(
	artists: ArtistModel[] = [band()],
	requests: EntityRequest[] = []
): {
	effect: FakeEffect;
	requestEffect: FakeRequestEffect;
	store: InstanceType<typeof OwnedArtistListStore>;
} {
	const effect: FakeEffect = {
		list$: jest.fn(() => of(artists)),
		remove$: jest.fn((artist) => of(artist)),
	};
	const requestEffect: FakeRequestEffect = {
		listMine$: jest.fn(() => of(requests)),
		submitCreate$: jest.fn(() => of(asked())),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			OwnedArtistListStore,
			{ provide: OwnedArtistEffect, useValue: effect },
			{ provide: RequestEffect, useValue: requestEffect },
		],
	});

	return {
		effect,
		requestEffect,
		store: TestBed.inject(OwnedArtistListStore),
	};
}

describe('OwnedArtistListStore', () => {
	it('loads the collector bands when the page opens', () => {
		const { store } = setUp();

		expect(store.artists()).toHaveLength(1);
		expect(store.loading()).toBe(false);
	});

	it('knows when there is nothing yet', () => {
		const { store } = setUp([]);

		expect(store.isEmpty()).toBe(true);
	});

	it('says so when the list cannot be read, rather than looking empty', () => {
		const { effect, store } = setUp();

		effect.list$.mockReturnValue(throwError(() => new Error('denied')));
		store.loadArtists();

		expect(store.failed()).toBe(true);
		expect(store.loading()).toBe(false);
	});

	it('does not remove on the click that asks', () => {
		const { effect, store } = setUp();

		store.askRemove(band());

		expect(effect.remove$).not.toHaveBeenCalled();
		expect(store.pendingRemoval()?.uid).toBe('a1');
	});

	it('removes on the click that confirms', () => {
		const { effect, store } = setUp();

		store.askRemove(band());
		store.confirmRemove();

		expect(effect.remove$).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'a1' })
		);
		expect(store.pendingRemoval()).toBeNull();
	});

	it('lets the collector change their mind', () => {
		const { effect, store } = setUp();

		store.askRemove(band());
		store.cancelRemove();
		store.confirmRemove();

		expect(effect.remove$).not.toHaveBeenCalled();
	});

	it('knows which band is already waiting for a decision', () => {
		const { store } = setUp([band()], [asked()]);

		expect(store.requestByArtist().get('a1')?.status).toBe('pending');
	});

	it('shows where a band stands by its latest request', () => {
		const { store } = setUp(
			[band()],
			[
				asked({ uid: 'r2', status: 'pending', createdAt: 2 }),
				asked({ uid: 'r1', status: 'rejected', createdAt: 1 }),
			]
		);

		expect(store.requestByArtist().get('a1')?.uid).toBe('r2');
	});

	it('submits the band as the collector saved it', () => {
		const { requestEffect, store } = setUp();

		store.submit(band());

		expect(requestEffect.submitCreate$).toHaveBeenCalledWith(
			expect.objectContaining({
				featureKey: 'artist',
				entityType: EntityTypeEnum.Artist,
				entity: expect.objectContaining({ uid: 'a1' }),
				// The band stays in the collector's drawer; the request only
				// points at the copy it was made from.
				ownedUid: 'a1',
			})
		);
	});

	it('submits one band at a time', () => {
		const { requestEffect, store } = setUp();

		requestEffect.submitCreate$.mockReturnValue(NEVER);
		store.submit(band());
		store.submit(band({ uid: 'a2' }));

		expect(requestEffect.submitCreate$).toHaveBeenCalledTimes(1);
	});

	it('says so when a band could not be submitted', () => {
		const { requestEffect, store } = setUp();

		requestEffect.submitCreate$.mockReturnValue(
			throwError(() => new Error('denied'))
		);
		store.submit(band());

		expect(store.submitFailed()).toBe(true);
		expect(store.submitting()).toBeNull();
	});

	it('keeps the bands when their requests cannot be read', () => {
		const { requestEffect, store } = setUp();

		requestEffect.listMine$.mockReturnValue(
			throwError(() => new Error('denied'))
		);
		store.loadRequests();

		expect(store.artists()).toHaveLength(1);
		expect(store.requests()).toEqual([]);
	});
});
