/**
 * What a collection is worth, and what a collector has actually earned.
 *
 * Two rules decide everything here. A collection scores nothing until it is
 * complete — an almost-finished shelf is not a collection — and the pressings
 * on that shelf raise the score above what the collection advertises, because
 * owning the original of a record is not the same as owning a reissue of it.
 */

/** One album that raised the score, and why. */
export interface ScoreHighlight {
	albumUid: string;
	albumName: string;
	/** In the collector's words: "original pressing", "limited edition"… */
	reasons: string[];
	/** Rounded points this album added on top of its share of the base. */
	points: number;
}

export interface MusicCollectionScore {
	collectionUid: string;
	/** What the collection advertises, before any pressing is considered. */
	basePoints: number;
	/** Raised by the pressings the collector owns. */
	bonusPoints: number;
	/** base + bonus: what finishing this collection would be worth. */
	totalPoints: number;
	/** What the collector holds right now — 0 until the collection is done. */
	earnedPoints: number;
	/** `basePoints` came from the rule, not from the curator. */
	derived: boolean;
	highlights: ScoreHighlight[];
}
