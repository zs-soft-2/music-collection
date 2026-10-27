/**
 * Where the ratings of every collector are added up: `album-rating/{albumId}`.
 *
 * Its own catalog-level collection rather than a field of the album, because
 * the catalog travels to every client in a bundle and this number changes
 * whenever anybody gives a star. The album page reads one document when it
 * is opened; nothing lists these, and no client writes one.
 */
export const ALBUM_RATING_COLLECTION = 'album-rating';

/** What everybody together thinks of one record. */
export interface AlbumRatingSummary {
	albumId: string;
	/** Collectors who rated it. */
	count: number;
	/** The average star, to one decimal. */
	average: number;
	/** How many gave one star, two, and so on up to five. */
	histogram: number[];
	/** Epoch milliseconds the sum was last redone. */
	updatedAt: number;
}

/**
 * Below this many ratings there is no community to speak of: an average of
 * one is one person's opinion wearing a crowd's clothes, and a visitor who
 * can see a profile could put a name to it. The document is written from the
 * first rating on — the number has to be there the moment the third arrives —
 * but the page stays quiet until there are enough voices in it.
 */
export const COMMUNITY_RATING_MIN_COUNT = 3;

/** What the album page says about everybody else's verdict. */
export interface CommunityVoice {
	average: number;
	count: number;
	/**
	 * The collector's own stars less the average, to one decimal; null while
	 * they have not rated it themselves. This is the interesting part: that
	 * a record is loved is pleasant, that it is loved *here* and nowhere
	 * else is a thing worth knowing about one's own taste.
	 */
	differsBy: number | null;
}

/**
 * The community's verdict, or null while too few have given one. A summary
 * that is missing altogether means the same thing — nobody has rated it.
 */
export function communityVoice(
	summary: AlbumRatingSummary | null,
	ownStars: number | null
): CommunityVoice | null {
	if (!summary || summary.count < COMMUNITY_RATING_MIN_COUNT) {
		return null;
	}

	return {
		average: summary.average,
		count: summary.count,
		differsBy:
			ownStars === null
				? null
				: Math.round((ownStars - summary.average) * 10) / 10,
	};
}
