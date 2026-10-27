import { MusicCollectionMembership } from './music-collection-progress';

/**
 * What to buy next.
 *
 * A collection pays nothing until it is complete, so the question a collector
 * actually asks is not "which record is missing" — there may be hundreds —
 * but "which one record, bought today, is worth the most". Two different
 * answers matter, and both are kept apart here: the record that finishes a
 * collection hands over its whole score at once, while every other missing
 * record only moves the shelf closer to a score still locked away.
 *
 * All of it is derived: nothing on this page is stored, and nothing is asked
 * of the server that resolving a collection did not already need.
 */

/** One collection asking for a record, as the suggestion shows it. */
export interface MusicCollectionDemand {
	collectionUid: string;
	/** How many records it still misses, this one counted. */
	missing: number;
	/** What finishing it would be worth to this collector. */
	totalPoints: number;
}

/** One record worth buying next, with what it would be worth and to whom. */
export interface NextAlbumSuggestion {
	album: MusicCollectionMembership;
	/**
	 * Points earned the moment this record is on the shelf: the full score of
	 * every collection it is the last missing album of. Zero for a record
	 * that finishes nothing, however many collections want it.
	 */
	unlockedPoints: number;
	/** The collections this one record would complete. */
	completesCollectionUids: string[];
	/**
	 * This record's share of the points still locked up in the collections
	 * asking for it — what it moves, rather than what it hands over. A record
	 * two collections away from finishing is worth more of it than one in a
	 * collection barely begun, and a record several collections want carries
	 * a share from each.
	 */
	potentialPoints: number;
	/** Every collection that wants it, the nearest to finishing first. */
	wantedBy: MusicCollectionDemand[];
}

/**
 * What one collection still asks of a collector: the narrow port the ranking
 * reads, so it needs neither the definition nor anyone's progress object.
 *
 * `missingAlbumUids` names albums of `albums`; a collection that asks for
 * nothing more — complete, or resolving to nothing — simply has none.
 */
export interface CollectionShortfall {
	collectionUid: string;
	/** The albums the collection asks for, as resolving found them. */
	albums: readonly MusicCollectionMembership[];
	/** Of those, the ones that are not on the shelf. */
	missingAlbumUids: readonly string[];
	/** What finishing it would be worth to this collector. */
	totalPoints: number;
}
