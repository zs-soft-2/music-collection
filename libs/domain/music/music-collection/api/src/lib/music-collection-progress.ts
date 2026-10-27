/** One album the collection asks for, as the collection pages show it. */
export interface MusicCollectionMembership {
	albumUid: string;
	albumName: string;
	artistUid: string;
	artistName: string;
	year: number | null;
	coverUrl: string | null;
}

/**
 * What a definition resolves to against the catalog of the moment. Derived
 * data: the definition is the source of truth, this is its shadow.
 */
export interface ResolvedMusicCollection {
	collectionUid: string;
	criteriaVersion: number;
	albums: MusicCollectionMembership[];
	total: number;
	/** Epoch milliseconds. */
	calculatedAt: number;
}

/**
 * How far a collector has got. Every field is computed from the resolved
 * collection and the shelf as they are now; nothing here is stored.
 *
 * `completed` therefore says "complete right now", not "was completed once":
 * an album entering the collection or a record leaving the shelf takes the
 * badge away again.
 */
export interface MusicCollectionProgress {
	collectionUid: string;
	total: number;
	owned: number;
	missing: number;
	/** 0–100, rounded; 0 while the collection resolves to nothing. */
	percentage: number;
	/** `owned === total`, and never true for an empty collection. */
	completed: boolean;
	ownedAlbumUids: string[];
	missingAlbumUids: string[];
}
