import {
	CountryEnum,
	FormatDescriptionEnum,
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

/**
 * Which credits have to be fetched before a set of rules can be resolved.
 *
 * The credits outnumber the albums several times over, so this is worth
 * asking before reaching for them: a rule that names its musicians can be
 * answered from their credits alone, and the rest of the catalog's need
 * never be downloaded.
 */
export type CreditsNeeded =
	/** No rule asks who played on a record. */
	| { kind: 'none' }
	/** Only these musicians' credits can decide any of the rules. */
	| { kind: 'musicians'; musicianUids: string[] }
	/** A rule asks by role alone, so any credit in the catalog may match. */
	| { kind: 'all' };

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
	/** Year of this pressing; null when the catalog does not know it. */
	releaseYear: number | null;
	/** `limited edition`, `picture disc`, `reissue`… as the catalog tags them. */
	editions: FormatDescriptionEnum[];
}
