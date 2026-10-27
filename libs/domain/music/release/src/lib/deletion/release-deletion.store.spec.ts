import { Observable, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	EMPTY_ENTITY_USAGE,
	EntityTypeEnum,
	EntityUsage,
	ReleaseEntity,
	TRACK_FEATURE_KEY,
} from '@music-collection/api';

import {
	RELEASE_IN_USE,
	ReleaseDeletionEffect,
} from './release-deletion.effect';
import { ReleaseDeletionStore } from './release-deletion.store';

const release = (fields: Partial<ReleaseEntity> = {}): ReleaseEntity =>
	({
		uid: 'r1',
		name: 'Master of Puppets — 1986 EU',
		entityType: EntityTypeEnum.Release,
		...fields,
	}) as ReleaseEntity;

interface FakeEffect {
	usage$: jest.Mock<Observable<EntityUsage>>;
	delete$: jest.Mock<Observable<void>>;
	archive$: jest.Mock<Observable<void>>;
}

function setUp(
	usage: EntityUsage = EMPTY_ENTITY_USAGE,
	overrides: Partial<FakeEffect> = {}
): { effect: FakeEffect; store: InstanceType<typeof ReleaseDeletionStore> } {
	const effect: FakeEffect = {
		usage$: jest.fn(() => of(usage)),
		delete$: jest.fn(() => of(undefined)),
		archive$: jest.fn(() => of(undefined)),
		...overrides,
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			ReleaseDeletionStore,
			{ provide: ReleaseDeletionEffect, useValue: effect },
		],
	});

	return { effect, store: TestBed.inject(ReleaseDeletionStore) };
}

describe('ReleaseDeletionStore', () => {
	it('asks what holds the pressing when the dialog opens', () => {
		const { effect, store } = setUp();
		const pressing = release();

		store.ask(pressing);

		expect(effect.usage$).toHaveBeenCalledWith(pressing);
		expect(store.pending()).toBe(pressing);
		expect(store.canDelete()).toBe(true);
	});

	it('offers no delete while nothing is known yet', () => {
		const { store } = setUp();

		// Nothing asked: the dialog is closed and has no answer to act on.
		expect(store.canDelete()).toBe(false);
	});

	it('counts the copies that refuse the delete', () => {
		const { store } = setUp({
			blocking: [{ featureKey: COLLECTION_ITEM_FEATURE_KEY, count: 4 }],
			cascading: [],
		});

		store.ask(release());

		expect(store.canDelete()).toBe(false);
		expect(store.copyCount()).toBe(4);
	});

	it('counts the tracks that would go with it', () => {
		const { store } = setUp({
			blocking: [],
			cascading: [{ featureKey: TRACK_FEATURE_KEY, count: 9 }],
		});

		store.ask(release());

		expect(store.canDelete()).toBe(true);
		expect(store.trackCount()).toBe(9);
	});

	it('closes the dialog once the pressing is gone', () => {
		const { effect, store } = setUp();

		store.ask(release());
		store.confirmDeletion();

		expect(effect.delete$).toHaveBeenCalled();
		expect(store.pending()).toBeNull();
		expect(store.doneAt()).not.toBeNull();
	});

	it('keeps the dialog open on the in-use refusal', () => {
		const { store } = setUp(EMPTY_ENTITY_USAGE, {
			delete$: jest.fn(() => throwError(() => new Error(RELEASE_IN_USE))),
		});

		store.ask(release());
		store.confirmDeletion();

		expect(store.error()).toBe(RELEASE_IN_USE);
		expect(store.pending()).not.toBeNull();
		expect(store.isWorking()).toBe(false);
	});

	it('archives the pressing it cannot delete', () => {
		const pressing = release();
		const { effect, store } = setUp({
			blocking: [{ featureKey: COLLECTION_ITEM_FEATURE_KEY, count: 1 }],
			cascading: [],
		});

		store.ask(pressing);
		store.setArchived(true);

		expect(effect.archive$).toHaveBeenCalledWith(pressing, true);
		expect(store.pending()).toBeNull();
	});

	it('knows an already archived pressing, so it offers to restore it', () => {
		const { store } = setUp();

		store.ask(release({ active: false }));

		expect(store.isArchived()).toBe(true);
	});

	it('forgets everything when the dialog is dismissed', () => {
		const { store } = setUp();

		store.ask(release());
		store.cancel();

		expect(store.pending()).toBeNull();
		expect(store.usage()).toBeNull();
		expect(store.error()).toBeNull();
	});
});
