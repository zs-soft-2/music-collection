export const RATING_FEATURE_KEY = 'rating';

/**
 * The stars a collector can give, as whole numbers. Five is the scale a
 * record fair, a sleeve note and Discogs all speak in; half stars would ask
 * a collector to split a hair they never wanted to split, and on a phone
 * they ask a thumb to hit a target half as wide.
 */
export const RATING_MIN_STARS = 1;
export const RATING_MAX_STARS = 5;

/** How long the one line next to the stars may be. */
export const RATING_NOTE_LIMIT = 280;

/**
 * From this many stars up, a record is one the collector loves — what the
 * shelf filter and the radio's own station both mean by it.
 *
 * Four, not five. A collector who has to reserve the word for perfection
 * ends up with three favourites and nothing to put on.
 */
export const LOVED_FROM_STARS = 4;

/**
 * What a collector thinks of a record, kept for the record rather than for
 * the copy: two pressings of the same album are the same music, and the
 * state of the plastic is already told by `CollectionItemCondition`.
 *
 * Entirely private. It lives under the user, the rules let nobody else near
 * it, and what leaves for other eyes leaves because its owner put it on a
 * shared profile — never because a query could reach it.
 */
export interface AlbumRating {
	/** The album's id: one record, one rating, rewritten when it changes. */
	uid: string;
	albumId: string;
	/**
	 * The record's name as it was when it was rated, so a ranking can be
	 * read without the catalog at hand.
	 */
	albumTitle: string;
	artistName: string | null;
	/**
	 * The artist, by our own id. The name travels for reading, this for
	 * matching: the hunt list asks "is this one of the artists they love",
	 * and two artists can share a name while no two share a uid.
	 */
	artistId: string | null;
	/** Whole stars, `RATING_MIN_STARS` to `RATING_MAX_STARS`. */
	stars: number;
	/** The one line about why; null while the stars stand alone. */
	note: string | null;
	/** Epoch milliseconds of the last time the collector touched it. */
	ratedAt: number;
}

/**
 * The stars as the form hands them over, before anything is known about
 * which album they belong to.
 */
export interface RatingDraft {
	stars: number;
	note: string | null;
}

/** What a rating is about: the record it names, by id and by name. */
export interface RatedAlbum {
	albumId: string;
	albumTitle: string;
	artistName: string | null;
	artistId: string | null;
}

/** Whether the stars are one of the five a collector can actually give. */
export function isValidStars(stars: number): boolean {
	return (
		Number.isInteger(stars) &&
		stars >= RATING_MIN_STARS &&
		stars <= RATING_MAX_STARS
	);
}

/**
 * The note as it is kept: trimmed, cut to the limit, and absent rather than
 * empty. A note of spaces is a note nobody wrote.
 */
export function normaliseNote(note: string | null | undefined): string | null {
	const trimmed = (note ?? '').trim();

	return trimmed ? trimmed.slice(0, RATING_NOTE_LIMIT) : null;
}

/**
 * The document to write. The album is named here and not looked up later:
 * the top list on a profile has to read as sentences, and a visitor to it
 * has no catalog.
 */
export function toRating(
	album: RatedAlbum,
	draft: RatingDraft,
	now = Date.now()
): AlbumRating {
	return {
		uid: album.albumId,
		albumId: album.albumId,
		albumTitle: album.albumTitle,
		artistName: album.artistName,
		artistId: album.artistId,
		stars: draft.stars,
		note: normaliseNote(draft.note),
		ratedAt: now,
	};
}

/** One album's rating, or null while the collector said nothing about it. */
export function ratingFor(
	ratings: readonly AlbumRating[],
	albumId: string | null
): AlbumRating | null {
	if (!albumId) {
		return null;
	}

	return ratings.find((rating) => rating.albumId === albumId) ?? null;
}

/** The stars per album, for a shelf that sorts and filters by them. */
export function starsByAlbum(
	ratings: readonly AlbumRating[]
): Map<string, number> {
	return new Map(ratings.map((rating) => [rating.albumId, rating.stars]));
}

/**
 * The records the collector loves, best first. What the radio's station
 * plays, and the order a tie in anything else falls back on.
 */
export function lovedAlbums(ratings: readonly AlbumRating[]): string[] {
	return ratings
		.filter((rating) => rating.stars >= LOVED_FROM_STARS)
		.sort((a, b) => b.stars - a.stars || b.ratedAt - a.ratedAt)
		.map((rating) => rating.albumId);
}

/**
 * The artists behind the records the collector loves, by uid.
 *
 * What the hunt list breaks a tie with: of two records worth the same
 * points, the one by an artist whose records they already love is the one
 * they will actually go out and buy.
 */
export function lovedArtists(ratings: readonly AlbumRating[]): Set<string> {
	const artists = new Set<string>();

	for (const rating of ratings) {
		if (rating.stars >= LOVED_FROM_STARS && rating.artistId) {
			artists.add(rating.artistId);
		}
	}

	return artists;
}

/** One record in a ranking of what the collector likes. */
export interface RatedRecord extends RatedAlbum {
	stars: number;
	note: string | null;
	ratedAt: number;
}

/** What the collector's ratings add up to. */
export interface RatingSummary {
	/** Records rated. */
	rated: number;
	/** The average of every star given, to one decimal; 0 while none were. */
	average: number;
	/** How many records got one star, two, and so on up to five. */
	histogram: number[];
	/** The records rated highest, the newest judgement first within a tie. */
	top: RatedRecord[];
}

/** How many records a ranking names. */
const TOP_COUNT = 5;

const EMPTY_SUMMARY: RatingSummary = {
	rated: 0,
	average: 0,
	histogram: [0, 0, 0, 0, 0],
	top: [],
};

/**
 * The ratings as one picture: how many, how generous, and which records the
 * collector would name first.
 *
 * The ranking puts the newest judgement first among equal stars. A shelf
 * grows, and of two records a collector calls perfect the one they reached
 * for last week is the one they would mention.
 */
export function summariseRatings(
	ratings: readonly AlbumRating[]
): RatingSummary {
	if (!ratings.length) {
		return EMPTY_SUMMARY;
	}

	const histogram = [0, 0, 0, 0, 0];
	let stars = 0;

	for (const rating of ratings) {
		stars += rating.stars;
		histogram[rating.stars - RATING_MIN_STARS] += 1;
	}

	const top = [...ratings]
		.sort((a, b) => b.stars - a.stars || b.ratedAt - a.ratedAt)
		.slice(0, TOP_COUNT)
		.map(
			({
				albumId,
				albumTitle,
				artistName,
				artistId,
				stars: given,
				note,
				ratedAt,
			}) => ({
				albumId,
				albumTitle,
				artistName,
				artistId,
				stars: given,
				note,
				ratedAt,
			})
		);

	return {
		rated: ratings.length,
		average: Math.round((stars / ratings.length) * 10) / 10,
		histogram,
		top,
	};
}
