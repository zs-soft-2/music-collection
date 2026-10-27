import { FormatDescriptionEnum } from '@music-collection/common/api';
import {
	MusicCollectionMembership,
	OwnedCopy,
	ResolvedMusicCollection,
} from '@music-collection/domain/music-collection/api';

import { owned } from './music-collection.fixture';
import {
	ageWeight,
	derivedBasePoints,
	scoreCollection,
} from './music-collection-score';

/** Scoring is done at a fixed moment, so the ages in here never drift. */
const NOW = Date.UTC(2026, 5, 1);
const THIS_YEAR = 2026;
/** Thirty-eight years old at `NOW`: all but fully vintage. */
const ALBUM_YEAR = 1988;
/** What an album of `ALBUM_YEAR` weighs: 38 / 40. */
const VINTAGE = 0.95;

function membership(
	albumUid: string,
	year: number | null = ALBUM_YEAR
): MusicCollectionMembership {
	return {
		albumUid,
		albumName: `Album ${albumUid}`,
		artistUid: 'artist',
		artistName: 'Artist',
		year,
		coverUrl: null,
	};
}

function resolved(
	albums: MusicCollectionMembership[]
): ResolvedMusicCollection {
	return {
		collectionUid: 'bay-area-1988',
		criteriaVersion: 1,
		albums,
		total: albums.length,
		calculatedAt: NOW,
	};
}

/** Four 1988 albums, base 400: one album is worth 100. */
const FOUR = resolved(['a', 'b', 'c', 'd'].map((uid) => membership(uid)));
const ALL_FOUR: OwnedCopy[] = [owned('a'), owned('b'), owned('c'), owned('d')];

const score = (
	copies: OwnedCopy[],
	completed: boolean,
	base: number | null = 400
) => scoreCollection(FOUR, copies, base, completed, NOW);

describe('ageWeight', () => {
	it('grows from nothing to one over forty years', () => {
		expect(ageWeight(THIS_YEAR, NOW)).toBe(0);
		expect(ageWeight(THIS_YEAR - 20, NOW)).toBe(0.5);
		expect(ageWeight(THIS_YEAR - 40, NOW)).toBe(1);
		expect(ageWeight(THIS_YEAR - 60, NOW)).toBe(1);
	});

	it('grants nothing for a year the catalog does not know', () => {
		expect(ageWeight(null, NOW)).toBe(0);
	});
});

describe('derivedBasePoints', () => {
	it('grows faster than the collection does', () => {
		// A fortieth record is harder to find than a fourth.
		const four = resolved(
			['a', 'b', 'c', 'd'].map((uid) => membership(uid, THIS_YEAR))
		).albums;
		const forty = resolved(
			Array.from({ length: 40 }, (_unused, index) =>
				membership(`album-${index}`, THIS_YEAR)
			)
		).albums;

		expect(derivedBasePoints(four, NOW)).toBe(43);
		expect(derivedBasePoints(forty, NOW)).toBe(720);
	});

	/* The point the collector made: an old record is not a new one. */
	it('counts an old album for nearly double a new one', () => {
		const fresh = [membership('a', THIS_YEAR)];
		const vintage = [membership('a', THIS_YEAR - 40)];

		expect(derivedBasePoints(fresh, NOW)).toBe(10);
		expect(derivedBasePoints(vintage, NOW)).toBe(20);
	});

	it('is nothing for a collection that resolves to nothing', () => {
		expect(derivedBasePoints([], NOW)).toBe(0);
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

	it('pays for an original pressing in proportion to its age', () => {
		const result = score(
			[owned('a', ALBUM_YEAR), owned('b'), owned('c'), owned('d')],
			true
		);

		// 0.4 × 0.95 of a 100-point share.
		expect(result.bonusPoints).toBe(Math.round(100 * 0.4 * VINTAGE));
		expect(result.highlights).toEqual([
			{
				albumUid: 'a',
				albumName: 'Album a',
				reasons: ['original pressing'],
				points: 38,
			},
		]);
	});

	/*
	 * Every copy of this year's record is an original pressing — the
	 * collector bought it in a shop, which is not a find.
	 */
	it('pays nothing for the original pressing of a new record', () => {
		const fresh = resolved([membership('a', THIS_YEAR)]);
		const result = scoreCollection(
			fresh,
			[owned('a', THIS_YEAR)],
			100,
			true,
			NOW
		);

		expect(result.bonusPoints).toBe(0);
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

		// 0.38 + 0.3 + 0.2 + 0.1, capped at 0.5 of a 100-point share.
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

		expect(result.bonusPoints).toBe(38);
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

		expect(cheap.bonusPoints).toBe(38);
		expect(prized.bonusPoints).toBe(380);
	});

	it('falls back to the rule when the curator named no base', () => {
		const result = score(ALL_FOUR, true, null);

		expect(result.derived).toBe(true);
		expect(result.basePoints).toBe(derivedBasePoints(FOUR.albums, NOW));
	});

	/*
	 * The promise "buy this record and you hold N points" is made from a
	 * score computed while the record is still missing, so `totalPoints` has
	 * to be what `earnedPoints` becomes once it arrives — and a floor, never
	 * a boast: the copy that completes the set may be a prized pressing and
	 * raise the bonus further.
	 */
	it('shows, while a record is missing, the least completing it earns', () => {
		const missingOne = [owned('a', ALBUM_YEAR), owned('b'), owned('c')];
		const promised = score(missingOne, false);

		expect(promised.earnedPoints).toBe(0);
		// The plainest copy of the last record earns exactly what was shown.
		expect(score([...missingOne, owned('d')], true).earnedPoints).toBe(
			promised.totalPoints
		);
		// A prized one earns more — the number shown is never a boast.
		expect(
			score(
				[
					...missingOne,
					owned('d', ALBUM_YEAR, [
						FormatDescriptionEnum.limitedEdition,
					]),
				],
				true
			).earnedPoints
		).toBeGreaterThan(promised.totalPoints);
	});

	it('scores an empty collection at nothing, earned or not', () => {
		const empty = scoreCollection(resolved([]), [], null, false, NOW);

		expect([empty.totalPoints, empty.earnedPoints]).toEqual([0, 0]);
	});
});
