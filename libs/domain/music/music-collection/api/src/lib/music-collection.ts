import {
	CountryEnum,
	Entity,
	FormatEnum,
	StyleName,
} from '@music-collection/common/api';

export type MusicCollectionStatus = 'draft' | 'published';

/**
 * Which shelf of the list a collection stands on. `discography` is every
 * collection that follows one band's own output rather than a scene, a year
 * or a style: there is one pair of them per band the catalog knows two
 * studio albums of, so they would bury the curated collections if they stood
 * among them. Null is the curated list itself.
 */
export type MusicCollectionGroup = 'discography';

export const MUSIC_COLLECTION_GROUPS: MusicCollectionGroup[] = ['discography'];

/** `link`: readable by whoever knows the id, but never listed. */
export type MusicCollectionVisibility = 'private' | 'link' | 'public';

export interface NumberCriterion {
	equals?: number;
	/** Inclusive. */
	from?: number;
	/** Inclusive. */
	to?: number;
}

export interface EnumCriterion<T extends string> {
	includesAny?: T[];
	includesAll?: T[];
	excludes?: T[];
}

/** Matches entities by uid. */
export interface ReferenceCriterion {
	includesAny?: string[];
}

/** A credit on the album: musicians, roles, or both. */
export interface CreditCriterion {
	/** Musician uids. */
	musicians?: string[];
	/** Discogs roles, e.g. "Producer", "Drums"; matched case-insensitively. */
	roles?: string[];
}

/**
 * What makes an album part of the collection. Every field given must hold —
 * they are ANDed — and within a field the operator decides.
 *
 * The criteria name albums, never pressings: the collection says which
 * records belong in it, not which edition of them, so owning any edition of
 * a required album counts. That is why there is no criterion for the label,
 * the media or the country of a pressing.
 */
export interface MusicCollectionCriteria {
	/** The album's release year. */
	years?: NumberCriterion;
	/** Styles of the album — the style it was written in. */
	styles?: EnumCriterion<StyleName>;
	/** Styles of the artist, which may be decades apart from the album's. */
	artistStyles?: EnumCriterion<StyleName>;
	/** `lp` for studio albums; a collection may take in `ep` or `live` too. */
	albumFormats?: EnumCriterion<FormatEnum>;
	artists?: ReferenceCriterion;
	/** Where the artist is from, not where the pressing was made. */
	artistCountries?: EnumCriterion<CountryEnum>;
	credits?: CreditCriterion;
}

/**
 * A generated pin. Every image a model draws is one of these: filed as a
 * `document` entity the moment it exists, whether or not it ever becomes
 * the badge. It keeps everything needed to cast the same badge again — a
 * badge nobody can reproduce could never be regenerated larger, or replaced
 * when one came out wrong.
 */
export interface BadgeImage {
	/** The `document` entity wrapping the file, where metadata can hang. */
	documentUid: string;
	name: string;
	/** The ready download URL, as covers have — straight into `<img src>`. */
	filePath: string;
	prompt: string;
	negativePrompt: string;
	seed: number;
	styleVersion: number;
	model: string;
	/** Epoch milliseconds. */
	generatedAt: number;
}

/** The reward for owning every album of the collection. */
export interface BadgeDefinition {
	name: string;
	description: string | null;
	/** PrimeIcons class, as the admin navigation uses them. */
	icon: string | null;
	artworkUrl: string | null;
	/**
	 * Drawn by an image model, then fixed. Absent on a draft the editor
	 * submits: the image is written by its own callable, and the server
	 * carries it across a definition save rather than trusting the client to
	 * send it back untouched.
	 */
	image?: BadgeImage | null;
	/**
	 * Every image ever drawn for this collection, oldest first — the one
	 * above among them. Drawing keeps them all rather than three in four
	 * dying with the page, so a later admin can still reach back and make
	 * any of them the badge without paying the model again.
	 */
	gallery?: BadgeImage[];
}

/**
 * A musically meaningful set of albums, defined by a rule rather than by a
 * list. What belongs to it is resolved against the catalog, so it changes
 * when the catalog does.
 */
export interface MusicCollection {
	name: string;
	slug: string;
	description: string | null;
	coverImageUrl: string | null;
	/** PrimeIcons class shown on the collection card. */
	icon: string | null;
	criteria: MusicCollectionCriteria;
	badge: BadgeDefinition | null;
	/**
	 * What completing it is worth. Null leaves it to the rule: a collection
	 * is then worth what its size says, and follows the catalog as it grows.
	 */
	basePoints: number | null;
	/** Parent in the collection tree; null at the top. */
	parentUid: string | null;
	/**
	 * Which group of the list it belongs to; null is the curated list. The
	 * group is not a parent: it says where a collection is shown, while
	 * `parentUid` says what it belongs under — a band's companion collection
	 * has both, the group it shares with every other discography and the
	 * studio-album collection it completes.
	 */
	group: MusicCollectionGroup | null;
	status: MusicCollectionStatus;
	visibility: MusicCollectionVisibility;
	/** Epoch milliseconds. */
	createdAt: number;
	/** Raised whenever the criteria change; resolved membership carries it. */
	criteriaVersion: number;
}

export type MusicCollectionEntity = MusicCollection & Entity;

export type MusicCollectionEntityAdd = Omit<MusicCollectionEntity, 'uid'>;

export type MusicCollectionEntityUpdate = Partial<MusicCollectionEntity> &
	Entity;
