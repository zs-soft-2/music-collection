import { EntityTypeEnum } from '@music-collection/common/api';
import {
	BadgeImage,
	MusicCollectionEntity,
	MusicCollectionMembership,
	MusicCollectionProgress,
	NextAlbumSuggestion,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';
import { scoreCollection } from '@music-collection/domain/music-collection/engine';

import {
	sortCollectionCards,
	toCollectionCard,
	toCollectionDetail,
	toNextAlbums,
} from './collections.mapper';
import { CollectionCardView } from './collections.model';

function membership(
	albumUid: string,
	coverUrl: string | null = null
): MusicCollectionMembership {
	return {
		albumUid,
		albumName: `Album ${albumUid}`,
		artistUid: `artist-${albumUid}`,
		artistName: `Artist ${albumUid}`,
		year: 1988,
		coverUrl,
	};
}

function pin(): BadgeImage {
	return {
		documentUid: 'document-1',
		name: 'thrash-historian.png',
		filePath: 'https://example.test/pin.png',
		prompt: 'a pin',
		negativePrompt: '',
		seed: 7,
		styleVersion: 1,
		model: 'imagen',
		generatedAt: 0,
	};
}

function collection(
	overrides: Partial<MusicCollectionEntity> = {}
): MusicCollectionEntity {
	return {
		entityType: EntityTypeEnum.MusicCollection,
		uid: 'bay-area-1988',
		name: '1988 Bay Area Thrash',
		slug: 'bay-area-1988',
		description: 'The studio albums of the 1988 Bay Area scene.',
		coverImageUrl: null,
		icon: null,
		criteria: {},
		badge: null,
		basePoints: null,
		parentUid: null,
		status: 'published',
		visibility: 'public',
		createdAt: 0,
		criteriaVersion: 1,
		...overrides,
	};
}

function standing(
	albums: MusicCollectionMembership[],
	ownedAlbumUids: string[],
	overrides: Partial<MusicCollectionEntity> = {}
): MusicCollectionStanding {
	const owned = new Set(ownedAlbumUids);
	const missingAlbumUids = albums
		.map(({ albumUid }) => albumUid)
		.filter((albumUid) => !owned.has(albumUid));
	const progress: MusicCollectionProgress = {
		collectionUid: 'bay-area-1988',
		total: albums.length,
		owned: ownedAlbumUids.length,
		missing: missingAlbumUids.length,
		percentage: albums.length
			? Math.round((ownedAlbumUids.length / albums.length) * 100)
			: 0,
		completed: albums.length > 0 && missingAlbumUids.length === 0,
		ownedAlbumUids,
		missingAlbumUids,
	};

	const definition = collection(overrides);
	const resolved = {
		collectionUid: 'bay-area-1988',
		criteriaVersion: 1,
		albums,
		total: albums.length,
		calculatedAt: 0,
	};

	return {
		collection: definition,
		resolved,
		progress,
		score: scoreCollection(
			resolved,
			ownedAlbumUids.map((albumUid) => ({
				albumUid,
				disposedAt: null,
				releaseYear: null,
				editions: [],
			})),
			definition.basePoints,
			progress.completed
		),
	};
}

const card = (
	name: string,
	percentage: number,
	total = 10
): CollectionCardView => ({ name, percentage, total }) as CollectionCardView;

describe('toCollectionCard', () => {
	it('carries the definition and the progress onto the card', () => {
		const view = toCollectionCard(
			standing([membership('a'), membership('b'), membership('c')], ['a'])
		);

		expect(view).toMatchObject({
			slug: 'bay-area-1988',
			name: '1988 Bay Area Thrash',
			owned: 1,
			missing: 2,
			total: 3,
			completed: false,
			badgeName: null,
		});
	});

	it('shows what it is worth, but earns nothing while incomplete', () => {
		const started = toCollectionCard(
			standing([membership('a'), membership('b')], ['a'], {
				basePoints: 500,
			})
		);
		const finished = toCollectionCard(
			standing([membership('a'), membership('b')], ['a', 'b'], {
				basePoints: 500,
			})
		);

		expect([started.points, started.earnedPoints]).toEqual([500, 0]);
		expect([finished.points, finished.earnedPoints]).toEqual([500, 500]);
	});

	it('names the badge the collection rewards', () => {
		const view = toCollectionCard(
			standing([membership('a')], ['a'], {
				badge: {
					name: 'Thrash Historian',
					description: null,
					icon: null,
					artworkUrl: null,
				},
			})
		);

		expect(view.badgeName).toBe('Thrash Historian');
	});

	it('puts the cast pin on the card, over the artwork typed in', () => {
		const view = toCollectionCard(
			standing([membership('a')], [], {
				badge: {
					name: 'Thrash Historian',
					description: null,
					icon: 'pi pi-star',
					artworkUrl: 'https://example.test/typed.png',
					image: pin(),
				},
			})
		);

		expect(view.badgeArtworkUrl).toBe('https://example.test/pin.png');
	});

	it('leaves the card without a picture while no badge has one', () => {
		const view = toCollectionCard(standing([membership('a')], []));

		expect(view.badgeArtworkUrl).toBeNull();
	});

	it('takes at most four covers, skipping the albums without one', () => {
		const view = toCollectionCard(
			standing(
				[
					membership('a'),
					membership('b', 'b.jpg'),
					membership('c', 'c.jpg'),
					membership('d', 'd.jpg'),
					membership('e', 'e.jpg'),
					membership('f', 'f.jpg'),
				],
				[]
			)
		);

		expect(view.covers).toEqual(['b.jpg', 'c.jpg', 'd.jpg', 'e.jpg']);
	});
});

describe('sortCollectionCards', () => {
	it('ranks by progress, and puts the collections resolving to nothing last', () => {
		const cards = [
			card('Empty', 0, 0),
			card('Started', 20),
			card('Almost', 90),
			card('Untouched', 0),
		];

		expect(sortCollectionCards(cards).map(({ name }) => name)).toEqual([
			'Almost',
			'Started',
			'Untouched',
			'Empty',
		]);
	});

	it('leaves the input untouched', () => {
		const cards = [card('Started', 20), card('Almost', 90)];

		sortCollectionCards(cards);

		expect(cards.map(({ name }) => name)).toEqual(['Started', 'Almost']);
	});
});

describe('toCollectionDetail', () => {
	it('marks each album with whether it is on the shelf', () => {
		const view = toCollectionDetail(
			standing(
				[membership('a'), membership('b'), membership('c')],
				['a', 'c']
			)
		);

		expect(
			view.albums.map(({ albumUid, owned }) => [albumUid, owned])
		).toEqual([
			['a', true],
			['b', false],
			['c', true],
		]);
	});

	it('keeps the badge unearned while an album is missing', () => {
		const badge = {
			name: 'Thrash Historian',
			description: 'Own every record of the scene.',
			icon: 'pi pi-star',
			artworkUrl: null,
		};
		const missing = toCollectionDetail(
			standing([membership('a'), membership('b')], ['a'], { badge })
		);
		const complete = toCollectionDetail(
			standing([membership('a'), membership('b')], ['a', 'b'], { badge })
		);

		expect(missing.badge?.earned).toBe(false);
		expect(complete.badge).toEqual({ ...badge, earned: true });
	});

	it('shows the pin an admin picked over the artwork typed in', () => {
		const view = toCollectionDetail(
			standing([membership('a')], ['a'], {
				badge: {
					name: 'Thrash Historian',
					description: null,
					icon: 'pi pi-star',
					artworkUrl: 'https://example.test/typed.png',
					image: pin(),
				},
			})
		);

		expect(view.badge?.artworkUrl).toBe('https://example.test/pin.png');
	});
});

function suggestion(
	albumUid: string,
	unlockedPoints: number,
	potentialPoints: number,
	wantedBy: NextAlbumSuggestion['wantedBy'],
	completesCollectionUids: string[] = []
): NextAlbumSuggestion {
	return {
		album: membership(albumUid),
		unlockedPoints,
		completesCollectionUids,
		potentialPoints,
		wantedBy,
	};
}

const named = (uid: string, name: string, slug = uid) =>
	({ uid, name, slug }) as CollectionCardView;

describe('toNextAlbums', () => {
	it('names the collections a record would complete, and where they are', () => {
		const views = toNextAlbums(
			[
				suggestion(
					'frolic',
					400,
					400,
					[{ collectionUid: 'bay-area', missing: 1, totalPoints: 400 }],
					['bay-area']
				),
			],
			[named('bay-area', '1988 Bay Area Thrash', 'bay-area-1988')]
		);

		expect(views).toEqual([
			{
				albumUid: 'frolic',
				albumName: 'Album frolic',
				artistName: 'Artist frolic',
				year: 1988,
				coverUrl: null,
				unlockedPoints: 400,
				completes: ['1988 Bay Area Thrash'],
				potentialPoints: 400,
				wantedBy: [
					{
						name: '1988 Bay Area Thrash',
						slug: 'bay-area-1988',
						missing: 1,
					},
				],
			},
		]);
	});

	it('keeps the order it was given: the ranking was decided before this', () => {
		const wanted = [
			{ collectionUid: 'doom', missing: 4, totalPoints: 800 },
		];

		const views = toNextAlbums(
			[
				suggestion('second', 0, 200, wanted),
				suggestion('first', 0, 100, wanted),
			],
			[named('doom', 'Doom')]
		);

		expect(views.map(({ albumUid }) => albumUid)).toEqual([
			'second',
			'first',
		]);
	});

	it('shows at most what the page has room for', () => {
		const wanted = [{ collectionUid: 'doom', missing: 9, totalPoints: 900 }];
		const many = Array.from({ length: 20 }, (_unused, index) =>
			suggestion(`album-${index}`, 0, 100, wanted)
		);

		expect(toNextAlbums(many, [named('doom', 'Doom')])).toHaveLength(6);
		expect(toNextAlbums(many, [named('doom', 'Doom')], 3)).toHaveLength(3);
	});

	/*
	 * A collection the page is not showing — withdrawn while the list stood
	 * open — has no name and no page to go to. Pointing at it would be worse
	 * than leaving it out.
	 */
	it('leaves out a collection the page cannot point at', () => {
		const views = toNextAlbums(
			[
				suggestion('kept', 0, 100, [
					{ collectionUid: 'doom', missing: 2, totalPoints: 200 },
					{ collectionUid: 'gone', missing: 3, totalPoints: 300 },
				]),
				suggestion('dropped', 0, 90, [
					{ collectionUid: 'gone', missing: 3, totalPoints: 300 },
				]),
			],
			[named('doom', 'Doom')]
		);

		expect(views).toHaveLength(1);
		expect(views[0].albumUid).toBe('kept');
		expect(views[0].wantedBy).toEqual([
			{ name: 'Doom', slug: 'doom', missing: 2 },
		]);
	});

	it('claims no points for a collection it cannot name', () => {
		const views = toNextAlbums(
			[
				suggestion(
					'kept',
					300,
					150,
					[
						{ collectionUid: 'doom', missing: 4, totalPoints: 600 },
						{ collectionUid: 'gone', missing: 1, totalPoints: 300 },
					],
					['gone']
				),
			],
			[named('doom', 'Doom')]
		);

		expect(views[0].completes).toEqual([]);
		// Nothing to point at, so nothing is promised — only what it moves.
		expect(views[0].unlockedPoints).toBe(0);
		expect(views[0].potentialPoints).toBe(150);
	});

	it('has nothing to show a collector who is missing nothing', () => {
		expect(toNextAlbums([], [named('doom', 'Doom')])).toEqual([]);
	});
});
