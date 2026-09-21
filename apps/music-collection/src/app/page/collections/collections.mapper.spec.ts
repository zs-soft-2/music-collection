import { EntityTypeEnum } from '@music-collection/common/api';
import {
	MusicCollectionEntity,
	MusicCollectionMembership,
	MusicCollectionProgress,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';
import { scoreCollection } from '@music-collection/domain/music-collection/engine';

import {
	sortCollectionCards,
	toCollectionCard,
	toCollectionDetail,
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
});
