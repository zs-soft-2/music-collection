import { Subject, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ReleaseEntity, ReleaseRarity } from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { ReleaseDetailsEffect } from '../../data/release-details';
import { ReleasePageStore } from './release-page.store';

const rarity = (fields: Partial<ReleaseRarity> = {}): ReleaseRarity => ({
	tier: 'uncommon',
	source: 'discogs',
	have: 640,
	calculatedAt: 1,
	...fields,
});

const release = (fields: Partial<ReleaseEntity> = {}): ReleaseEntity =>
	({
		uid: 'rel1',
		name: 'Bonded by Blood',
		media: 'vinyl',
		album: { uid: 'al1', name: 'Bonded by Blood' },
		artist: { uid: 'ar1', name: 'Exodus' },
		rarity: rarity(),
		rarityOverride: null,
		...fields,
	}) as unknown as ReleaseEntity;

interface FakeEffect {
	load$: jest.Mock;
	overrideRarity$: jest.Mock;
	refreshRarity$: jest.Mock;
}

function setUp(overrides: Partial<FakeEffect> = {}): {
	effect: FakeEffect;
	store: InstanceType<typeof ReleasePageStore>;
} {
	const effect: FakeEffect = {
		load$: jest.fn(() => of({ release: release(), pressings: [] })),
		overrideRarity$: jest.fn(() =>
			of(rarity({ tier: 'veryRare', source: 'manual', have: null }))
		),
		refreshRarity$: jest.fn(() => of(rarity({ tier: 'rare', have: 210 }))),
		...overrides,
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			ReleasePageStore,
			{ provide: ReleaseDetailsEffect, useValue: effect },
			{
				provide: ActivatedRoute,
				useValue: {
					paramMap: of(convertToParamMap({ releaseId: 'rel1' })),
				},
			},
		],
	});

	return { effect, store: TestBed.inject(ReleasePageStore) };
}

describe('ReleasePageStore — rarity', () => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows the tier the server answers an override with', () => {
		const { effect, store } = setUp();

		store.overrideRarity({ tier: 'veryRare', note: 'Test pressing' });

		expect(effect.overrideRarity$).toHaveBeenCalledWith(
			'rel1',
			'veryRare',
			'Test pressing'
		);
		expect(store.release()?.rarity).toEqual(
			rarity({ tier: 'veryRare', source: 'manual', have: null })
		);
		expect(store.release()?.rarityOverride).toMatchObject({
			tier: 'veryRare',
			note: 'Test pressing',
		});
		expect(store.raritySaving()).toBe(false);
		expect(store.rarityError()).toBeNull();
	});

	it('takes the override back and shows what the sources decide', () => {
		const { effect, store } = setUp({
			load$: jest.fn(() =>
				of({
					release: release({
						rarity: rarity({ tier: 'ultraRare', source: 'manual' }),
						rarityOverride: {
							tier: 'ultraRare',
							note: 'Signed',
							byUserId: 'u1',
							at: 1,
						},
					}),
					pressings: [],
				})
			),
			overrideRarity$: jest.fn(() => of(rarity())),
		});

		store.overrideRarity({ tier: null, note: '' });

		expect(effect.overrideRarity$).toHaveBeenCalledWith('rel1', null, '');
		expect(store.release()?.rarityOverride).toBeNull();
		expect(store.release()?.rarity).toEqual(rarity());
	});

	it('works the tier out again without touching the override', () => {
		const { effect, store } = setUp();

		store.refreshRarity();

		expect(effect.refreshRarity$).toHaveBeenCalledWith('rel1');
		expect(store.release()?.rarity).toEqual(
			rarity({ tier: 'rare', have: 210 })
		);
		expect(store.release()?.rarityOverride).toBeNull();
	});

	it('keeps the tier and says why when the server refuses', () => {
		const { store } = setUp({
			overrideRarity$: jest.fn(() =>
				throwError(() => new Error('permission-denied'))
			),
		});

		store.overrideRarity({ tier: 'rare', note: 'Why' });

		expect(store.release()?.rarity).toEqual(rarity());
		expect(store.release()?.rarityOverride).toBeNull();
		expect(store.raritySaving()).toBe(false);
		expect(store.rarityError()).toBe('permission-denied');
	});

	it('sends one change at a time', () => {
		const answer = new Subject<ReleaseRarity>();
		const { effect, store } = setUp({
			overrideRarity$: jest.fn(() => answer),
		});

		store.overrideRarity({ tier: 'rare', note: 'First' });
		store.overrideRarity({ tier: 'common', note: 'Second' });

		expect(store.raritySaving()).toBe(true);
		expect(effect.overrideRarity$).toHaveBeenCalledTimes(1);

		answer.next(rarity({ tier: 'rare', source: 'manual' }));
		answer.complete();

		expect(store.raritySaving()).toBe(false);
		expect(store.release()?.rarityOverride?.note).toBe('First');
	});
});
