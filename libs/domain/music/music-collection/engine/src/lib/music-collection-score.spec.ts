import { MediaEnum, RarityTier } from '@music-collection/common/api';
import {
	MusicCollectionMembership,
	OwnedCopy,
	ResolvedMusicCollection,
} from '@music-collection/domain/music-collection/api';

import { disposed, owned } from './music-collection.fixture';
import {
	ageWeight,
	basePoints,
	copyPoints,
	scoreCollection,
	sizeFactor,
} from './music-collection-score';

const NOW = Date.UTC(2026, 5, 1);
const { vinyl, cd, cassette, boxset, dvd } = MediaEnum;

function membership(albumUid: string): MusicCollectionMembership {
	return {
		albumUid,
		albumName: `Album ${albumUid}`,
		artistUid: 'artist',
		artistName: 'Artist',
		year: 1988,
		coverUrl: null,
	};
}

function resolved(albumUids: string[]): ResolvedMusicCollection {
	return {
		collectionUid: 'bay-area',
		criteriaVersion: 1,
		albums: albumUids.map(membership),
		total: albumUids.length,
		calculatedAt: NOW,
	};
}

function collectionOf(size: number): ResolvedMusicCollection {
	return resolved(
		Array.from({ length: size }, (_unused, index) => `${index}`)
	);
}

const EIGHT = resolved(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);

/** The shelf of the docs' worked example: six vinyls and two CDs. */
const DOCS_SHELF: OwnedCopy[] = [
	owned('a', vinyl, 'rare'),
	owned('b', vinyl, 'veryRare'),
	owned('c', vinyl, 'uncommon'),
	owned('d', vinyl),
	owned('e', vinyl),
	owned('f', vinyl),
	owned('g', cd, 'uncommon'),
	owned('h', cd),
];

describe('ageWeight', () => {
	it('grows from nothing to one over forty years', () => {
		expect(ageWeight(2026, NOW)).toBe(0);
		expect(ageWeight(2006, NOW)).toBe(0.5);
		expect(ageWeight(1966, NOW)).toBe(1);
	});

	it('grants nothing for a year the catalog does not know', () => {
		expect(ageWeight(null, NOW)).toBe(0);
	});
});

describe('sizeFactor', () => {
	it('starts at one and adds a quarter every time the count doubles', () => {
		expect(sizeFactor(2)).toBe(1);
		expect(sizeFactor(4)).toBe(1.25);
		expect(sizeFactor(8)).toBe(1.5);
		expect(sizeFactor(20)).toBe(1.83);
		expect(sizeFactor(64)).toBe(2.25);
	});

	it('has no ceiling, so a collection has no largest size', () => {
		expect(sizeFactor(1000)).toBe(3.24);
		expect(sizeFactor(100_000)).toBeGreaterThan(sizeFactor(1000));
	});

	it('is nothing below the fewest albums a collection needs', () => {
		expect(sizeFactor(1)).toBe(0);
		expect(sizeFactor(0)).toBe(0);
	});
});

describe('basePoints', () => {
	it('is the most modest shelf: five points an album, times the size', () => {
		expect(basePoints(2)).toBe(10);
		expect(basePoints(8)).toBe(60);
		expect(basePoints(20)).toBe(183);
	});
});

describe('copyPoints', () => {
	it('weighs the medium: vinyl, box set, CD, then cassette and DVD', () => {
		const points = (media: MediaEnum) =>
			copyPoints({ media, rarity: 'common' });

		expect(points(vinyl)).toBe(10);
		expect(points(boxset)).toBe(8);
		expect(points(cd)).toBe(7);
		expect(points(cassette)).toBe(5);
		expect(points(dvd)).toBe(5);
	});

	it('multiplies by how rare the pressing is', () => {
		const points = (rarity: RarityTier) =>
			copyPoints({ media: vinyl, rarity });

		expect(points('common')).toBe(10);
		expect(points('uncommon')).toBe(12.5);
		expect(points('rare')).toBe(16);
		expect(points('veryRare')).toBe(20);
		expect(points('ultraRare')).toBe(25);
	});
});

describe('scoreCollection', () => {
	it('adds the albums up and multiplies by the size, on a mixed shelf too', () => {
		const score = scoreCollection(EIGHT, DOCS_SHELF);

		expect(score.albumPoints).toBe(94.25);
		expect(score.sizeFactor).toBe(1.5);
		expect(score.formatFactor).toBe(1);
		expect(score.uniformMedia).toBeNull();
		expect(score.totalPoints).toBe(141);
		expect(score.earnedPoints).toBe(141);
	});

	it('rewards a set of a piece: vinyl most, then CD, then cassette', () => {
		const all = (media: MediaEnum) =>
			scoreCollection(
				EIGHT,
				EIGHT.albums.map((album) => owned(album.albumUid, media))
			);

		expect(all(vinyl)).toMatchObject({
			formatFactor: 1.5,
			uniformMedia: vinyl,
			totalPoints: 180,
		});
		expect(all(cd)).toMatchObject({
			formatFactor: 1.3,
			uniformMedia: cd,
			totalPoints: 109,
		});
		expect(all(cassette)).toMatchObject({
			formatFactor: 1.15,
			uniformMedia: cassette,
			totalPoints: 69,
		});
	});

	it('gives a set of box sets or DVDs no format multiplier', () => {
		for (const media of [boxset, dvd]) {
			const score = scoreCollection(
				EIGHT,
				EIGHT.albums.map((album) => owned(album.albumUid, media))
			);

			expect(score.formatFactor).toBe(1);
			expect(score.uniformMedia).toBeNull();
		}
	});

	it('scores the docs example at 222 once the two CDs are vinyls', () => {
		const shelf = [
			...DOCS_SHELF.slice(0, 6),
			owned('g', vinyl),
			owned('h', vinyl),
		];

		expect(scoreCollection(EIGHT, shelf)).toMatchObject({
			albumPoints: 98.5,
			formatFactor: 1.5,
			totalPoints: 222,
			earnedPoints: 222,
		});
	});

	it('counts the best copy of an album, not every copy', () => {
		const two = resolved(['a', 'b']);
		const score = scoreCollection(two, [
			owned('a', cd),
			owned('a', cd, 'rare'),
			owned('b', cassette),
		]);

		expect(score.albums[0]).toMatchObject({
			media: cd,
			rarity: 'rare',
			copies: 2,
		});
		expect(score.albums[0].points).toBeCloseTo(11.2);
		expect(score.totalPoints).toBe(16);
	});

	it('lets a common vinyl stand in for a rarer CD when it makes the set whole', () => {
		const two = resolved(['a', 'b']);
		const score = scoreCollection(two, [
			owned('a', vinyl),
			// 17.5 points against the vinyl's 10 — but it breaks the set.
			owned('a', cd, 'ultraRare'),
			owned('b', vinyl),
		]);

		// Mixed: 27.5. All vinyl: 20 × 1.5 = 30.
		expect(score.uniformMedia).toBe(vinyl);
		expect(score.albums[0].media).toBe(vinyl);
		expect(score.totalPoints).toBe(30);
	});

	it('keeps the mixed counting where it is worth more than the set', () => {
		const two = resolved(['a', 'b']);
		const score = scoreCollection(two, [
			owned('a', cassette),
			owned('a', vinyl, 'ultraRare'),
			owned('b', cassette),
		]);

		// Mixed: 25 + 5 = 30. All cassette: 10 × 1.15 = 11.5.
		expect(score.uniformMedia).toBeNull();
		expect(score.totalPoints).toBe(30);
	});

	it('ignores a copy that left the collection', () => {
		const two = resolved(['a', 'b']);
		const score = scoreCollection(two, [owned('a'), disposed('b')]);

		expect(score.earnedPoints).toBe(0);
		expect(score.albums[1]).toMatchObject({ media: null, copies: 0 });
	});

	it('earns nothing while an album is missing, and shows the least it will come to', () => {
		const score = scoreCollection(EIGHT, DOCS_SHELF.slice(0, 6));

		expect(score.earnedPoints).toBe(0);
		// 78.5 on the shelf, two missing albums at five each, times 1.5.
		expect(score.albumPoints).toBe(88.5);
		expect(score.formatFactor).toBe(1);
		expect(score.totalPoints).toBe(133);
	});

	it('is worth its base to a collector who owns none of it', () => {
		const score = scoreCollection(EIGHT, []);

		expect(score.basePoints).toBe(60);
		expect(score.totalPoints).toBe(60);
		expect(score.earnedPoints).toBe(0);
		expect(score.opportunities).toEqual([]);
	});

	it('names the albums missing from a set of a piece within reach', () => {
		const score = scoreCollection(EIGHT, DOCS_SHELF);

		expect(score.opportunities).toEqual([
			{ media: vinyl, missingAlbumUids: ['g', 'h'], minimumPoints: 222 },
		]);
	});

	it('offers no set on a medium fewer than half the albums are on', () => {
		const score = scoreCollection(EIGHT, [
			...EIGHT.albums.map((album) => owned(album.albumUid, cd)),
			owned('a', vinyl),
			owned('b', vinyl),
			owned('c', vinyl),
		]);

		expect(score.uniformMedia).toBe(cd);
		expect(score.opportunities).toEqual([]);
	});

	it('offers no set that would be worth less than the shelf already is', () => {
		const two = resolved(['a', 'b']);
		const score = scoreCollection(two, [
			owned('a', vinyl, 'ultraRare'),
			owned('a', cassette),
			owned('b', vinyl, 'ultraRare'),
		]);

		// All vinyl already: 50 × 1.5 = 75. All cassette would be 11.5.
		expect(score.totalPoints).toBe(75);
		expect(score.opportunities).toEqual([]);
	});

	it('scores a thousand albums as readily as eight', () => {
		const thousand = collectionOf(1000);
		const score = scoreCollection(
			thousand,
			thousand.albums.map((album) => owned(album.albumUid))
		);

		expect(score.sizeFactor).toBe(3.24);
		expect(score.totalPoints).toBe(Math.round(10_000 * 3.24 * 1.5));
		expect(score.albums).toHaveLength(1000);
	});

	it('puts a collection of fewer than two albums at rest', () => {
		for (const size of [0, 1]) {
			const small = collectionOf(size);
			const score = scoreCollection(
				small,
				small.albums.map((album) => owned(album.albumUid))
			);

			expect(score).toMatchObject({
				suspended: true,
				basePoints: 0,
				totalPoints: 0,
				earnedPoints: 0,
			});
		}
	});
});
