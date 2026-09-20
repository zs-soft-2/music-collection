import {
	CountryEnum,
	FormatEnum,
	StyleEnum,
} from '@music-collection/common/api';

/**
 * What resolving a collection needs to know about the catalog and about a
 * collector's shelf. These are narrow ports, not a second model: the app maps
 * its entities onto them, which keeps the resolver free of Angular, of
 * Firestore and of everything on an album that has nothing to do with
 * belonging to a collection.
 */

/** An album of the catalog, as the criteria see it. */
export interface CatalogAlbum {
	uid: string;
	name: string;
	artistUid: string;
	artistName: string;
	/** Release year; null when the catalog does not know it. */
	year: number | null;
	styles: StyleEnum[];
	/** lp, ep, live…; null on albums saved before the field existed. */
	format: FormatEnum | null;
	coverUrl: string | null;
}

/** An artist of the catalog, as the criteria see it. */
export interface CatalogArtist {
	uid: string;
	styles: StyleEnum[];
	country: CountryEnum | null;
}

/** One musician's credit on an album. */
export interface CatalogCredit {
	albumUid: string;
	musicianUid: string;
	/** Discogs role, e.g. "Guitar", "Producer". */
	role: string;
}

export interface MusicCollectionCatalog {
	albums: CatalogAlbum[];
	artists: CatalogArtist[];
	/** Needed only by collections with a `credits` criterion. */
	credits?: CatalogCredit[];
}

/**
 * One copy on a collector's shelf. Several copies may point at the same
 * album — different pressings, or simply two of the same — and the engine is
 * what decides that they still count once.
 */
export interface OwnedCopy {
	/** The album (master) this copy is a pressing of. */
	albumUid: string;
	/** Null while owned; the epoch ms it left the collection once gone. */
	disposedAt: number | null;
}
