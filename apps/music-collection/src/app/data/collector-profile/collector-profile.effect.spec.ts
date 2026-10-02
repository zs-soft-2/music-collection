import { BehaviorSubject, Observable, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AuthenticationStateService,
	CollectionItemStateService,
	UserStateService,
	WishlistItemStateService,
} from '@music-collection/api';
import { EntityTypeEnum } from '@music-collection/common/api';
import {
	MusicCollectionEntity,
	MusicCollectionProgress,
} from '@music-collection/domain/music-collection/api';
import {
	MusicCollectionEffect,
	MusicCollectionStanding,
} from '@music-collection/domain/music-collection/core';

import {
	COLLECTION_FOLLOWING_SETTING,
	CollectionFollowing,
} from '../collection-following';
import { RatingEffect } from '../rating';
import { NO_LOCATION, UserLocationEffect } from '../user-location';
import { UserSetting, UserSettingsEffect } from '../user-settings';

import { CollectorProfileEffect } from './collector-profile.effect';
import {
	CollectorProfileSettings,
	NO_COLLECTOR_PROFILE,
} from './collector-profile.model';
import { CollectorProfileRepository } from './collector-profile.repository';

/**
 * The two consents, as the watch sees them.
 *
 * Both are user settings, and the effect tells them apart by nothing but the
 * setting handed to `value$` — so the fake does the same.
 */
const ME = 'u1';
const MEGADETH = 'collection-megadeth';

/** Long enough for the write delay to pass. */
const AFTER_THE_DELAY = 4000;

function collection(): MusicCollectionEntity {
	return {
		entityType: EntityTypeEnum.MusicCollection,
		uid: MEGADETH,
		name: 'Megadeth — Studio Albums',
		slug: 'megadeth-studio-albums',
		description: null,
		coverImageUrl: null,
		icon: null,
		criteria: {},
		badge: null,
		basePoints: 100,
		parentUid: null,
		group: null,
		status: 'published',
		visibility: 'public',
		createdAt: 0,
		criteriaVersion: 1,
	};
}

/** Thirteen of seventeen: followed, begun, nowhere near finished. */
function standing(): MusicCollectionStanding {
	const definition = collection();
	const progress: MusicCollectionProgress = {
		collectionUid: definition.uid,
		total: 17,
		owned: 13,
		missing: 4,
		percentage: 76,
		completed: false,
		ownedAlbumUids: [],
		missingAlbumUids: [],
	};

	return {
		collection: definition,
		resolved: {
			collectionUid: definition.uid,
			criteriaVersion: 1,
			albums: [],
			total: 17,
			calculatedAt: 0,
		},
		progress,
		score: {
			basePoints: 100,
			copyPoints: 0,
			earnedPoints: 0,
			awarded: false,
			copyBonuses: [],
		},
	} as unknown as MusicCollectionStanding;
}

interface FakeRepository {
	save: jest.Mock;
	saveAlbums: jest.Mock;
	saveCard: jest.Mock;
	remove: jest.Mock;
	removeAlbums: jest.Mock;
	removeCard: jest.Mock;
}

interface Harness {
	effect: CollectorProfileEffect;
	repository: FakeRepository;
	sharing: BehaviorSubject<CollectorProfileSettings>;
	following: BehaviorSubject<CollectionFollowing>;
}

function setUp(
	sharing: CollectorProfileSettings,
	following: CollectionFollowing
): Harness {
	const sharing$ = new BehaviorSubject(sharing);
	const following$ = new BehaviorSubject(following);
	const repository: FakeRepository = {
		save: jest.fn().mockResolvedValue(undefined),
		saveAlbums: jest.fn().mockResolvedValue(undefined),
		saveCard: jest.fn().mockResolvedValue(undefined),
		remove: jest.fn().mockResolvedValue(undefined),
		removeAlbums: jest.fn().mockResolvedValue(undefined),
		removeCard: jest.fn().mockResolvedValue(undefined),
	};
	const settings = {
		value$: (setting: UserSetting<unknown>): Observable<unknown> =>
			setting.id === COLLECTION_FOLLOWING_SETTING.id
				? following$
				: sharing$,
		save: jest.fn().mockResolvedValue(undefined),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			CollectorProfileEffect,
			{ provide: UserSettingsEffect, useValue: settings },
			{ provide: CollectorProfileRepository, useValue: repository },
			{
				provide: AuthenticationStateService,
				useValue: {
					selectIsAuthenticated$: () => of(true),
					selectAuthenticatedUser$: () => of({ uid: ME }),
				},
			},
			{
				provide: UserStateService,
				useValue: {
					selectEntityById$: () =>
						of({ uid: ME, displayName: 'Zsolt', photoURL: null }),
				},
			},
			{
				provide: CollectionItemStateService,
				useValue: { selectLoadedEntities$: () => of([]) },
			},
			{
				provide: MusicCollectionEffect,
				useValue: { listStandings$: () => of([standing()]) },
			},
			{
				provide: WishlistItemStateService,
				useValue: { selectLoadedOwnEntities$: () => of([]) },
			},
			{
				provide: UserLocationEffect,
				useValue: { settings$: () => of(NO_LOCATION) },
			},
			{ provide: RatingEffect, useValue: { list$: () => of([]) } },
		],
	});

	return {
		effect: TestBed.inject(CollectorProfileEffect),
		repository,
		sharing: sharing$,
		following: following$,
	};
}

beforeEach(() => {
	jest.useFakeTimers();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

describe('CollectorProfileEffect.watch', () => {
	/**
	 * The bug this answers: the wall was empty for a collector whose only
	 * consent was a shown collection, because the watch was started on the
	 * page consent alone.
	 */
	it('lists a collector who shows a collection without sharing a page', async () => {
		const { effect, repository } = setUp(NO_COLLECTOR_PROFILE, {
			followed: [MEGADETH],
			shown: [MEGADETH],
		});

		effect.watch();
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		expect(repository.saveCard).toHaveBeenCalledWith(
			expect.objectContaining({
				uid: ME,
				collecting: [
					{
						slug: 'megadeth-studio-albums',
						name: 'Megadeth — Studio Albums',
					},
				],
				hasPage: false,
				copies: 0,
				points: 0,
			})
		);
	});

	it('publishes no page for them: that is the other consent', async () => {
		const { effect, repository } = setUp(NO_COLLECTOR_PROFILE, {
			followed: [MEGADETH],
			shown: [MEGADETH],
		});

		effect.watch();
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		expect(repository.save).not.toHaveBeenCalled();
		expect(repository.saveAlbums).not.toHaveBeenCalled();
	});

	/**
	 * A collection followed in private says nothing to anybody, and a
	 * collector who has said nothing should not cost a write — nor a delete
	 * of documents that were never written.
	 */
	it('writes nothing for a collector who shares nothing', async () => {
		const { effect, repository } = setUp(NO_COLLECTOR_PROFILE, {
			followed: [MEGADETH],
			shown: [],
		});

		effect.watch();
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		expect(repository.saveCard).not.toHaveBeenCalled();
		expect(repository.removeCard).not.toHaveBeenCalled();
		expect(repository.remove).not.toHaveBeenCalled();
		expect(repository.removeAlbums).not.toHaveBeenCalled();
	});

	it('takes the entry down when the last shown collection is taken back', async () => {
		const { effect, repository, following } = setUp(NO_COLLECTOR_PROFILE, {
			followed: [MEGADETH],
			shown: [MEGADETH],
		});

		effect.watch();
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		following.next({ followed: [MEGADETH], shown: [] });
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		expect(repository.removeCard).toHaveBeenCalledWith(ME);
		// The page was never there to take away.
		expect(repository.remove).not.toHaveBeenCalled();
	});

	/**
	 * The entry may have been published in an earlier session, and this one
	 * has never looked at it. A switch turned off in front of the collector
	 * takes it down anyway — here before the first write has even run.
	 */
	it('takes an entry it has never seen down when the collector asks', async () => {
		const { effect, repository, following } = setUp(NO_COLLECTOR_PROFILE, {
			followed: [MEGADETH],
			shown: [MEGADETH],
		});

		effect.watch();
		effect.takesBack();
		following.next({ followed: [MEGADETH], shown: [] });
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		expect(repository.saveCard).not.toHaveBeenCalled();
		expect(repository.removeCard).toHaveBeenCalledWith(ME);
	});

	it('keeps the entry when the page consent arrives, and fills it in', async () => {
		const { effect, repository, sharing } = setUp(NO_COLLECTOR_PROFILE, {
			followed: [MEGADETH],
			shown: [MEGADETH],
		});

		effect.watch();
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		sharing.next({
			shared: true,
			shareWishlist: false,
			shareRatings: false,
		});
		await jest.advanceTimersByTimeAsync(AFTER_THE_DELAY);

		expect(repository.save).toHaveBeenCalledWith(
			expect.objectContaining({ uid: ME })
		);
		expect(repository.saveCard).toHaveBeenLastCalledWith(
			expect.objectContaining({ uid: ME, hasPage: true })
		);
		expect(repository.removeCard).not.toHaveBeenCalled();
	});
});
