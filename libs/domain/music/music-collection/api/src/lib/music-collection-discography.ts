import { FormatEnum } from '@music-collection/common/api';

import { MusicCollectionDraft } from './music-collection-function';

/**
 * A band's own collections: the studio albums, and everything else they put
 * out beside them.
 *
 * A discography is the one kind of collection nobody has to think up. The
 * rule is always the same — this band, this set of formats — so the catalog
 * itself says which bands deserve one and what it would catch. What a curator
 * still decides is whether to open it at all: every published definition is
 * resolved on the client on every visit, so these are opened band by band
 * rather than for the whole catalog at once.
 */

/**
 * How many studio albums a band needs before a discography is worth
 * collecting. One album is a record, not a discography — and a collection of
 * one is finished by buying one record.
 */
export const DISCOGRAPHY_STUDIO_ALBUM_MINIMUM = 2;

/** The studio albums: what the main collection of a discography asks for. */
export const DISCOGRAPHY_STUDIO_FORMATS: FormatEnum[] = [FormatEnum.lp];

/**
 * Everything else the catalog files under a band. Named one by one rather
 * than written as "not lp": an album saved before the format field existed
 * has no format at all, and `excludes` would sweep every one of those into
 * the companion collection.
 */
export const DISCOGRAPHY_COMPANION_FORMATS: FormatEnum[] = [
	FormatEnum.ep,
	FormatEnum.single,
	FormatEnum.maxi,
	FormatEnum.live,
	FormatEnum.compilation,
];

/** What the two slugs of a discography are built from. */
export const DISCOGRAPHY_MAIN_SLUG_SUFFIX = '-studio-albums';
export const DISCOGRAPHY_COMPANION_SLUG_SUFFIX = '-beyond-the-albums';

/** One band the catalog knows enough of to open a discography for. */
export interface DiscographyCandidate {
	artistUid: string;
	/** The band's name, without the Discogs disambiguation number. */
	artistName: string;
	/**
	 * The base both slugs are built on, already free of every slug the
	 * definitions use. It is not simply the name: the Discogs import files
	 * the same band twice ("Testament" beside "Testament (2)"), and two
	 * bands whose names make the same slug cannot both have it.
	 */
	slug: string;
	/** Studio albums — at least `DISCOGRAPHY_STUDIO_ALBUM_MINIMUM` of them. */
	studioAlbumCount: number;
	/** Singles, EPs, live records, compilations. May be zero. */
	companionAlbumCount: number;
	/**
	 * The collection that already follows this band alone, by name; null
	 * while there is none. A band is not offered twice, and a curated
	 * collection of one band's records counts as one too — two rules over the
	 * same records would mean two badges for the same shelf.
	 */
	coveredBy: string | null;
}

/**
 * The pair a discography is opened as. The companion's `parentUid` is null
 * here and set when the main collection exists: the parent is the collection
 * it completes, and that uid is only known once the server has written it.
 */
export interface DiscographyPlan {
	main: MusicCollectionDraft;
	companion: MusicCollectionDraft;
}

/** One collection of a created pair, as the page reports it. */
export interface CreatedDiscographyCollection {
	uid: string;
	name: string;
	slug: string;
	status: MusicCollectionDraft['status'];
}

/** What opening a discography created. */
export interface DiscographyCreation {
	artistUid: string;
	artistName: string;
	main: CreatedDiscographyCollection;
	companion: CreatedDiscographyCollection;
}
