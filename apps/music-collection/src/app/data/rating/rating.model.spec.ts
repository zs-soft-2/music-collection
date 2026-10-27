import {
	AlbumRating,
	RATING_NOTE_LIMIT,
	isValidStars,
	normaliseNote,
	ratingFor,
	starsByAlbum,
	summariseRatings,
	toRating,
} from './rating.model';

const rating = (
	albumId: string,
	stars: number,
	overrides: Partial<AlbumRating> = {}
): AlbumRating => ({
	uid: albumId,
	albumId,
	albumTitle: albumId.toUpperCase(),
	artistName: 'Artist',
	artistId: 'artist-1',
	stars,
	note: null,
	ratedAt: 1000,
	...overrides,
});

describe('isValidStars', () => {
	it('takes the five a collector can give', () => {
		expect([1, 2, 3, 4, 5].every(isValidStars)).toBe(true);
	});

	it('refuses what is off the scale or between two stars', () => {
		expect(isValidStars(0)).toBe(false);
		expect(isValidStars(6)).toBe(false);
		expect(isValidStars(4.5)).toBe(false);
		expect(isValidStars(Number.NaN)).toBe(false);
	});
});

describe('normaliseNote', () => {
	it('keeps a note the collector wrote', () => {
		expect(normaliseNote('  The pressing to own  ')).toBe(
			'The pressing to own'
		);
	});

	it('treats a note of nothing as no note', () => {
		expect(normaliseNote('   ')).toBeNull();
		expect(normaliseNote('')).toBeNull();
		expect(normaliseNote(null)).toBeNull();
		expect(normaliseNote(undefined)).toBeNull();
	});

	it('cuts a note to the length the rules allow', () => {
		const note = normaliseNote('a'.repeat(RATING_NOTE_LIMIT + 50));

		expect(note?.length).toBe(RATING_NOTE_LIMIT);
	});
});

describe('toRating', () => {
	it('names the record, so a ranking reads without the catalog', () => {
		const written = toRating(
			{
				albumId: 'a',
				albumTitle: 'Kind of Blue',
				artistName: 'Miles Davis',
				artistId: 'artist-miles',
			},
			{ stars: 5, note: ' ' },
			4242
		);

		expect(written).toEqual({
			uid: 'a',
			albumId: 'a',
			albumTitle: 'Kind of Blue',
			artistName: 'Miles Davis',
			artistId: 'artist-miles',
			stars: 5,
			note: null,
			ratedAt: 4242,
		});
	});
});

describe('ratingFor', () => {
	const ratings = [rating('a', 5), rating('b', 2)];

	it('finds what was said about one record', () => {
		expect(ratingFor(ratings, 'b')?.stars).toBe(2);
	});

	it('says nothing about a record never judged', () => {
		expect(ratingFor(ratings, 'c')).toBeNull();
		expect(ratingFor(ratings, null)).toBeNull();
	});
});

describe('starsByAlbum', () => {
	it('hands the shelf a star per record', () => {
		const stars = starsByAlbum([rating('a', 5), rating('b', 3)]);

		expect(stars.get('a')).toBe(5);
		expect(stars.get('b')).toBe(3);
		expect(stars.has('c')).toBe(false);
	});
});

describe('summariseRatings', () => {
	it('adds the verdicts up', () => {
		const summary = summariseRatings([
			rating('a', 5),
			rating('b', 4),
			rating('c', 4),
		]);

		expect(summary.rated).toBe(3);
		expect(summary.average).toBe(4.3);
		expect(summary.histogram).toEqual([0, 0, 0, 2, 1]);
	});

	it('ranks the records by the stars they were given', () => {
		const summary = summariseRatings([
			rating('a', 3),
			rating('b', 5),
			rating('c', 4),
		]);

		expect(summary.top.map((record) => record.albumId)).toEqual([
			'b',
			'c',
			'a',
		]);
	});

	it('names the record judged last among equal stars', () => {
		const summary = summariseRatings([
			rating('old', 5, { ratedAt: 100 }),
			rating('recent', 5, { ratedAt: 900 }),
		]);

		expect(summary.top[0].albumId).toBe('recent');
	});

	it('names at most five records', () => {
		const summary = summariseRatings(
			Array.from({ length: 9 }, (_, index) =>
				rating(`a${index}`, 5, { ratedAt: index })
			)
		);

		expect(summary.top).toHaveLength(5);
	});

	it('has nothing to say about a shelf nobody judged', () => {
		expect(summariseRatings([])).toEqual({
			rated: 0,
			average: 0,
			histogram: [0, 0, 0, 0, 0],
			top: [],
		});
	});
});
