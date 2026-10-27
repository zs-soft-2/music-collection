import { EntityTypeEnum } from '@music-collection/common/api';
import { MusicCollectionEntity } from '@music-collection/domain/music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import { CollectionCardView } from '../collections/collections.model';
import { CollectionCrowd } from '../collectors/collectors.model';

import {
	filterCollectionTiles,
	pickCollectionOfTheWeek,
	pickHeroCollections,
	toCollectionChips,
	toCollectionTabs,
	toCollectionTiles,
} from './home-collections.mapper';
import { CollectionTileView } from './home.model';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function card(overrides: Partial<CollectionCardView> = {}): CollectionCardView {
	return {
		uid: 'bay-area',
		slug: 'bay-area',
		name: 'Bay Area Thrash',
		description: null,
		icon: null,
		coverImageUrl: null,
		badgeName: null,
		badgeArtworkUrl: null,
		owned: 15,
		total: 24,
		missing: 9,
		percentage: 62,
		completed: false,
		points: 340,
		earnedPoints: 0,
		bonusPoints: 0,
		covers: [],
		group: null,
		...overrides,
	};
}

function tile(overrides: Partial<CollectionTileView> = {}): CollectionTileView {
	return {
		...card(),
		finishers: [],
		finisherCount: 0,
		hunters: [],
		hunterCount: 0,
		followed: false,
		...overrides,
	};
}

function standing(
	overrides: Partial<MusicCollectionEntity> = {}
): MusicCollectionStanding {
	const collection: MusicCollectionEntity = {
		entityType: EntityTypeEnum.MusicCollection,
		uid: 'bay-area',
		name: 'Bay Area Thrash',
		slug: 'bay-area',
		description: null,
		coverImageUrl: null,
		icon: null,
		criteria: {},
		badge: null,
		basePoints: null,
		parentUid: null,
		group: null,
		status: 'published',
		visibility: 'public',
		createdAt: 0,
		criteriaVersion: 1,
		...overrides,
	};

	return { collection } as MusicCollectionStanding;
}

describe('toCollectionTiles', () => {
	it('carries the faces and the star onto the card', () => {
		const crowds = new Map<string, CollectionCrowd>([
			[
				'bay-area',
				{
					finishers: [
						{
							uid: 'collector-1',
							displayName: 'Nagy Z',
							photoURL: null,
							initial: 'N',
						},
					],
					finisherCount: 3,
					hunters: [],
					hunterCount: 12,
				},
			],
		]);

		const [view] = toCollectionTiles(
			[card()],
			crowds,
			new Set(['bay-area'])
		);

		expect(view).toMatchObject({
			slug: 'bay-area',
			finisherCount: 3,
			hunterCount: 12,
			followed: true,
		});
	});

	it('leaves a collection nobody is on with an empty crowd', () => {
		const [view] = toCollectionTiles([card()], new Map(), new Set());

		expect(view).toMatchObject({
			finishers: [],
			finisherCount: 0,
			hunters: [],
			hunterCount: 0,
			followed: false,
		});
	});
});

describe('toCollectionTabs', () => {
	it('counts what stands behind each tab and drops the empty ones', () => {
		const tabs = toCollectionTabs([
			tile({ uid: 'a', slug: 'a', followed: true, owned: 0 }),
			tile({ uid: 'b', slug: 'b', owned: 3 }),
			tile({
				uid: 'c',
				slug: 'c',
				owned: 0,
				group: 'discography',
			}),
		]);

		expect(tabs).toEqual([
			{ value: 'mine', labelKey: 'home.collections.tab.mine', count: 2 },
			{
				value: 'curated',
				labelKey: 'home.collections.tab.curated',
				count: 2,
			},
			{
				value: 'discography',
				labelKey: 'home.collections.tab.discography',
				count: 1,
			},
		]);
	});
});

describe('filterCollectionTiles', () => {
	it('keeps the collector’s own, starred or already started', () => {
		const tiles = [
			tile({ uid: 'a', slug: 'a', owned: 0, followed: true }),
			tile({ uid: 'b', slug: 'b', owned: 2 }),
			tile({ uid: 'c', slug: 'c', owned: 0 }),
		];

		expect(
			filterCollectionTiles(tiles, 'mine', 10).map(({ uid }) => uid)
		).toEqual(['a', 'b']);
	});

	it('stops at the limit', () => {
		const tiles = [
			tile({ uid: 'a', slug: 'a' }),
			tile({ uid: 'b', slug: 'b' }),
			tile({ uid: 'c', slug: 'c' }),
		];

		expect(filterCollectionTiles(tiles, 'curated', 2)).toHaveLength(2);
	});
});

describe('toCollectionChips', () => {
	it('names the style and the years the rule asks for', () => {
		expect(
			toCollectionChips({
				styles: { includesAny: ['Thrash', 'Speed Metal', 'Crossover'] },
				years: { from: 1983, to: 1991 },
			})
		).toEqual(['Thrash', 'Speed Metal', '1983–1991']);
	});

	it('says nothing where the rule names a list of artists', () => {
		expect(
			toCollectionChips({ artists: { includesAny: ['metallica'] } })
		).toEqual([]);
	});
});

describe('pickCollectionOfTheWeek', () => {
	const tiles = [
		tile({ uid: 'a', slug: 'a', name: 'A' }),
		tile({ uid: 'b', slug: 'b', name: 'B' }),
	];
	const standings = [
		standing({ uid: 'a', slug: 'a' }),
		standing({
			uid: 'b',
			slug: 'b',
			criteria: { styles: { includesAny: ['Doom'] } },
		}),
	];

	it('stays on the same collection for a whole week', () => {
		const monday = pickCollectionOfTheWeek(tiles, standings, 10 * WEEK_MS);
		const saturday = pickCollectionOfTheWeek(
			tiles,
			standings,
			10 * WEEK_MS + 5 * 24 * 60 * 60 * 1000
		);

		expect(saturday?.slug).toBe(monday?.slug);
	});

	it('moves on with the week', () => {
		const week = pickCollectionOfTheWeek(tiles, standings, 10 * WEEK_MS);
		const next = pickCollectionOfTheWeek(tiles, standings, 11 * WEEK_MS);

		expect(next?.slug).not.toBe(week?.slug);
	});

	it('dresses the hero with the chips of its own rule', () => {
		const picked = [10, 11]
			.map((week) =>
				pickCollectionOfTheWeek(tiles, standings, week * WEEK_MS)
			)
			.find((found) => found?.slug === 'b');

		expect(picked?.chips).toEqual(['Doom']);
	});

	it('never stands a discography or an empty collection in the hero', () => {
		expect(
			pickCollectionOfTheWeek(
				[
					tile({ uid: 'c', slug: 'c', group: 'discography' }),
					tile({ uid: 'd', slug: 'd', total: 0 }),
				],
				standings,
				0
			)
		).toBeNull();
	});
});

describe('pickHeroCollections', () => {
	const standings = [
		standing({ uid: 'a', slug: 'a' }),
		standing({
			uid: 'b',
			slug: 'b',
			criteria: { styles: { includesAny: ['Doom'] } },
		}),
		standing({ uid: 'c', slug: 'c' }),
		standing({ uid: 'd', slug: 'd' }),
	];

	const tiles = [
		tile({ uid: 'a', slug: 'a', name: 'A', owned: 0, percentage: 0 }),
		tile({ uid: 'b', slug: 'b', name: 'B', owned: 0, percentage: 0 }),
		tile({ uid: 'c', slug: 'c', name: 'C', owned: 0, percentage: 90 }),
		tile({ uid: 'd', slug: 'd', name: 'D', owned: 4, percentage: 20 }),
	];

	it("opens on the week's collection", () => {
		const heroes = pickHeroCollections(tiles, standings, 10 * WEEK_MS, 4);

		expect(heroes[0].slug).toBe(
			pickCollectionOfTheWeek(tiles, standings, 10 * WEEK_MS)?.slug
		);
	});

	it('offers what the shelf is already on before the rest', () => {
		const heroes = pickHeroCollections(tiles, standings, 10 * WEEK_MS, 4);

		// The week's is 'c'; of the rest only 'd' has records on the shelf,
		// so it comes first and the untouched ones follow by name.
		expect(heroes.slice(1).map(({ slug }) => slug)).toEqual([
			'd',
			'a',
			'b',
		]);
	});

	it('names each of them only once, and stops at the limit', () => {
		const heroes = pickHeroCollections(tiles, standings, 10 * WEEK_MS, 2);
		const slugs = heroes.map(({ slug }) => slug);

		expect(heroes).toHaveLength(2);
		expect(new Set(slugs).size).toBe(2);
	});

	it('dresses every one of them with the chips of its own rule', () => {
		const heroes = pickHeroCollections(tiles, standings, 10 * WEEK_MS, 4);

		expect(heroes.find((hero) => hero.slug === 'b')?.chips).toEqual([
			'Doom',
		]);
	});

	it('has nothing to show where no collection stands for the hero', () => {
		expect(
			pickHeroCollections(
				[tile({ uid: 'x', slug: 'x', group: 'discography' })],
				standings,
				0,
				4
			)
		).toEqual([]);
	});
});
