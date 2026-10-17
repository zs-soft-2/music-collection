import { Observable, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AlbumEntity,
	COLLECTION_ITEM_FEATURE_KEY,
	EMPTY_ENTITY_USAGE,
	EntityTypeEnum,
	EntityUsage,
	RELEASE_FEATURE_KEY,
} from '@music-collection/api';

import { ALBUM_IN_USE, AlbumDeletionEffect } from './album-deletion.effect';
import { AlbumDeletionStore } from './album-deletion.store';

const album = {
	uid: 'al1',
	name: 'Scream Bloody Gore',
	entityType: EntityTypeEnum.Album,
	artist: { uid: 'a1', name: 'Deathrow' },
} as AlbumEntity;

interface FakeEffect {
	usage$: jest.Mock<Observable<EntityUsage>>;
	delete$: jest.Mock<Observable<void>>;
}

function setUp(
	usage: EntityUsage = EMPTY_ENTITY_USAGE,
	overrides: Partial<FakeEffect> = {}
): { effect: FakeEffect; store: InstanceType<typeof AlbumDeletionStore> } {
	const effect: FakeEffect = {
		usage$: jest.fn(() => of(usage)),
		delete$: jest.fn(() => of(undefined)),
		...overrides,
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			AlbumDeletionStore,
			{ provide: AlbumDeletionEffect, useValue: effect },
		],
	});

	return { effect, store: TestBed.inject(AlbumDeletionStore) };
}

describe('AlbumDeletionStore', () => {
	it('says what goes with the album, own copies included', () => {
		const { store } = setUp({
			blocking: [],
			cascading: [
				{ featureKey: RELEASE_FEATURE_KEY, count: 2 },
				{ featureKey: COLLECTION_ITEM_FEATURE_KEY, count: 2 },
			],
		});

		store.ask(album);

		expect(store.canDelete()).toBe(true);
		expect(store.releaseCount()).toBe(2);
		expect(store.ownCopyCount()).toBe(2);
		expect(store.foreignCopyCount()).toBe(0);
	});

	it('refuses while another collector holds a copy', () => {
		const { store } = setUp({
			blocking: [{ featureKey: COLLECTION_ITEM_FEATURE_KEY, count: 1 }],
			cascading: [],
		});

		store.ask(album);

		expect(store.canDelete()).toBe(false);
		expect(store.foreignCopyCount()).toBe(1);
	});

	it('closes the dialog once the album is gone', () => {
		const { effect, store } = setUp();

		store.ask(album);
		store.confirmDeletion();

		expect(effect.delete$).toHaveBeenCalledWith(album);
		expect(store.pending()).toBeNull();
		expect(store.doneAt()).not.toBeNull();
	});

	it('still deletes after a refused attempt', () => {
		const { effect, store } = setUp(EMPTY_ENTITY_USAGE, {
			delete$: jest
				.fn()
				.mockReturnValueOnce(throwError(() => new Error(ALBUM_IN_USE)))
				.mockReturnValue(of(undefined)),
		});

		store.ask(album);
		store.confirmDeletion();

		expect(store.error()).toBe(ALBUM_IN_USE);

		store.confirmDeletion();

		expect(effect.delete$).toHaveBeenCalledTimes(2);
		expect(store.pending()).toBeNull();
	});
});
