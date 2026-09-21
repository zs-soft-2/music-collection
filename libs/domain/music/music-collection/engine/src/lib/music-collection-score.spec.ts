import { FormatDescriptionEnum } from '@music-collection/common/api';
import {
	MusicCollectionMembership,
	OwnedCopy,
	ResolvedMusicCollection,
} from '@music-collection/domain/music-collection/api';

import { owned } from './music-collection.fixture';
import { derivedBasePoints, scoreCollection } from './music-collection-score';

const ALBUM_YEAR = 1988;

function membership(albumUid: string): MusicCollectionMembership {
	return {
		albumUid,
		albumName: `Album ${albumUid}`,
		artistUid: 'artist',
		artistName: 'Artist',
		year: ALBUM_YEAR,
		coverUrl: null,
	};
}

function resolved(albumUids: string[]): ResolvedMusicCollection {
	return {
		collectionUid: 'bay-area-1988',
		criteriaVersion: 1,
		albums: albumUids.map(membership),
		total: albumUids.length,
		calculatedAt: 0,
	};
}

/** Four albums, base 400: one album is worth 100. */
const FOUR = resolved(['a', 'b', 'c', 'd']);
const ALL_FOUR: OwnedCopy[] = [owned('a'), owned('b'), owned('c'), owned('d')];

const score = (
	copies: OwnedCopy[],
	completed: boolean,
	base: number | null = 400
) => scoreCollection(FOUR, copies, base, completed);

describe('derivedBasePoints', () => {
	it('grows faster than the collection does', () => {
		// A fortieth record is harder to find than a fourth.
		expect(derivedBasePoints(4)).toBe(43);
		expect(derivedBasePoints(40)).toBe(720);
		expect(derivedBasePoints(40)).toBeGreaterThan(
			10 * derivedBasePoints(4)
		);
	});

	it('is nothing for a collection that resolves to nothing', () => {
		expect(derivedBasePoints(0)).toBe(0);
	});
});

describe('scoreCollection', () => {
	it('earns nothing while an album is missing', () => {
		const incomplete = score([owned('a'), owned('b')], false);

		expect(incomplete.earnedPoints).toBe(0);
		// What it would be worth is still on show.
		expect(incomplete.totalPoints).toBe(400);
	});

	it('earns the whole score once the collection is complete', () => {
		expect(score(ALL_FOUR, true).earnedPoints).toBe(400);
	});

	it('adds a quarter of an album share for an original pressing', () => {
		const result = score(
			[owned('a', ALBUM_YEAR), owned('b'), owned('c'), owned('d')],
			true
		);

		expect(result.bonusPoints).toBe(25);
		expect(result.totalPoints).toBe(425);
		expect(result.highlights).toEqual([
			{
				albumUid: 'a',
				albumName: 'Album a',
				reasons: ['original pressing'],
				points: 25,
			},
		]);
	});

	it('does not call a reissue of the same year an original', () => {
		const result = score(
			[
				owned('a', ALBUM_YEAR, [FormatDescriptionEnum.reissue]),
				owned('b'),
				owned('c'),
				owned('d'),
			],
			true
		);

		expect(result.bonusPoints).toBe(0);
	});

	it('adds up what one pressing is, but never more than half a share', () => {
		const result = score(
			[
				owned('a', ALBUM_YEAR, [
					FormatDescriptionEnum.limitedEdition,
					FormatDescriptionEnum.pictureDisc,
					FormatDescriptionEnum.g180,
				]),
				owned('b'),
				owned('c'),
				owned('d'),
			],
			true
		);

		// 0.25 + 0.3 + 0.2 + 0.1 = 0.85, capped at 0.5 of a 100-point share.
		expect(result.bonusPoints).toBe(50);
	});

	it('counts the best copy of an album, not every copy', () => {
		const result = score(
			[
				owned('a'),
				owned('a', ALBUM_YEAR),
				owned('b'),
				owned('c'),
				owned('d'),
			],
			true
		);

		expect(result.bonusPoints).toBe(25);
		expect(result.highlights).toHaveLength(1);
	});

	it('ignores a copy that left the collection', () => {
		const result = score(
			[
				{
					albumUid: 'a',
					disposedAt: 1_600_000_000_000,
					releaseYear: ALBUM_YEAR,
					editions: [FormatDescriptionEnum.limitedEdition],
				},
				owned('a'),
				owned('b'),
				owned('c'),
				owned('d'),
			],
			true
		);

		expect(result.bonusPoints).toBe(0);
	});

	it('shares the base between the albums, so a bonus follows the worth', () => {
		const cheap = score([owned('a', ALBUM_YEAR), ...ALL_FOUR], true, 400);
		const prized = score([owned('a', ALBUM_YEAR), ...ALL_FOUR], true, 4000);

		expect(cheap.bonusPoints).toBe(25);
		expect(prized.bonusPoints).toBe(250);
	});

	it('falls back to the rule when the curator named no base', () => {
		const result = score(ALL_FOUR, true, null);

		expect(result.derived).toBe(true);
		expect(result.basePoints).toBe(derivedBasePoints(4));
	});

	it('scores an empty collection at nothing, earned or not', () => {
		const empty = scoreCollection(resolved([]), [], null, false);

		expect([empty.totalPoints, empty.earnedPoints]).toEqual([0, 0]);
	});
});
