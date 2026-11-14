import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
	ArtistStateService,
	MusicianStateService,
} from '@music-collection/api';
import { GenreEffect } from '@music-collection/domain/genre';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';

import { CollectionImageEffect } from '../../../../data/collection-image';
import { MusicCollectionEditStore } from './music-collection-edit.store';

/** As PREVIEW_DEBOUNCE_MS in the store. */
const PREVIEW_DEBOUNCE_MS = 250;

const albums = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		albumUid: `al${index}`,
		albumName: `Album ${index}`,
	}));

/**
 * The store with a rule that reaches `total` albums, the preview settled.
 */
function setUp(total: number): InstanceType<typeof MusicCollectionEditStore> {
	const named = { selectEntities$: () => of([{ uid: 'x', name: 'X' }]) };

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			MusicCollectionEditStore,
			{
				provide: MusicCollectionEffect,
				useValue: {
					preview$: () => of({ albums: albums(total), total }),
					listAllResolutions$: () => of([]),
					loadProbeSetup$: () => of({ models: [], locks: [] }),
				},
			},
			{ provide: CollectionImageEffect, useValue: {} },
			{ provide: ArtistStateService, useValue: named },
			{ provide: MusicianStateService, useValue: named },
			{ provide: GenreEffect, useValue: { styles$: of([]) } },
			{ provide: Router, useValue: { navigate: jest.fn() } },
		],
	});

	const store = TestBed.inject(MusicCollectionEditStore);

	store.setName('Bay Area thrash');
	store.setCriteria(store.form().criteria);
	jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS);

	return store;
}

describe('MusicCollectionEditStore — the least a collection needs', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('saves a draft the rule reaches one album for, and says it is too few', () => {
		const store = setUp(1);

		expect(store.previewTotal()).toBe(1);
		expect(store.tooFewAlbums()).toBe(true);
		expect(store.canSave()).toBe(true);
	});

	it('does not publish a collection of one album', () => {
		const store = setUp(1);

		store.setField({ status: 'published' });

		expect(store.canSave()).toBe(false);
	});

	it('publishes from two albums on', () => {
		const store = setUp(2);

		store.setField({ status: 'published' });

		expect(store.tooFewAlbums()).toBe(false);
		expect(store.canSave()).toBe(true);
		// Two common copies on the humblest medium, at a size factor of 1.
		expect(store.derivedPoints()).toBe(10);
	});

	it('does not judge the count while the catalog is still being walked', () => {
		const store = setUp(1);

		store.setField({ status: 'published' });
		store.setCriteria(store.form().criteria);

		expect(store.isPreviewing()).toBe(true);
		expect(store.tooFewAlbums()).toBe(false);
		expect(store.canSave()).toBe(true);

		jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS);

		expect(store.canSave()).toBe(false);
	});
});
