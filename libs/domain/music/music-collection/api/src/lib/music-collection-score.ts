import { MediaEnum, RarityTier } from '@music-collection/common/api';

/**
 * What a collection is worth, and what a collector has actually earned.
 *
 * Four things decide it, and none of them is money. What the album is on —
 * a vinyl is worth more than a CD, a CD more than a cassette. How rare the
 * pressing on the shelf is. How large the collection is, because twenty
 * records are harder to gather than five. And whether the set is of a piece:
 * a collector who has every album on the same medium earns a multiplier a
 * mixed shelf does not.
 *
 * One rule stands over all of it: a collection scores nothing until it is
 * complete — an almost-finished shelf is not a collection.
 */

/** The media a whole set can be gathered on, and be rewarded for it. */
export type UniformMedia = MediaEnum.vinyl | MediaEnum.cd | MediaEnum.cassette;

/** One album of the collection, and the copy that counts for it. */
export interface AlbumScore {
	albumUid: string;
	albumName: string;
	/** What the counting copy is on; null while the album is missing. */
	media: MediaEnum | null;
	/** How rare the counting copy is; null while the album is missing. */
	rarity: RarityTier | null;
	/**
	 * Medium × rarity, unrounded. A missing album stands at the least an
	 * album can be worth, which is what makes the total a floor.
	 */
	points: number;
	/** How many copies of it the collector holds; the best of them counts. */
	copies: number;
}

/**
 * A set of a piece within reach: most of the collection is already on one
 * medium, and these are the albums still missing on it.
 */
export interface FormatOpportunity {
	media: UniformMedia;
	missingAlbumUids: string[];
	/** The least the set would be worth once those are on the shelf. */
	minimumPoints: number;
}

export interface MusicCollectionScore {
	collectionUid: string;
	/**
	 * What the collection is worth on the most modest shelf there is. The
	 * same for everybody, and what a collector who owns none of it is shown.
	 */
	basePoints: number;
	/** The albums' points added up, before either multiplier. */
	albumPoints: number;
	/** Grows with the number of albums, without a ceiling. */
	sizeFactor: number;
	/** Above 1 only where every counting copy is on the same medium. */
	formatFactor: number;
	/** The medium of a set of a piece; null on a mixed or unfinished one. */
	uniformMedia: UniformMedia | null;
	/**
	 * What finishing it is worth to this collector. On a complete collection
	 * it is the score; on an unfinished one, the least it will come to.
	 */
	totalPoints: number;
	/** What the collector holds right now — 0 until the collection is done. */
	earnedPoints: number;
	/** The rule reaches fewer albums than a collection needs: it is at rest. */
	suspended: boolean;
	/** In the collection's own order. */
	albums: AlbumScore[];
	/** The sets of a piece within reach, the most valuable first. */
	opportunities: FormatOpportunity[];
}
