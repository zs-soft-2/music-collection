import { of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ArtistModel,
	CountryEnum,
	EntityTypeEnum,
} from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { OwnedArtistEffect } from '../../../data/owned-artist';
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

function setUp(artists: ArtistModel[] = [band()]): {
	effect: FakeEffect;
	store: InstanceType<typeof OwnedArtistListStore>;
} {
	const effect: FakeEffect = {
		list$: jest.fn(() => of(artists)),
		remove$: jest.fn((artist) => of(artist)),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			OwnedArtistListStore,
			{ provide: OwnedArtistEffect, useValue: effect },
		],
	});

	return { effect, store: TestBed.inject(OwnedArtistListStore) };
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
});
