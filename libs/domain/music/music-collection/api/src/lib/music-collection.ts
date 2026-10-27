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
 * A pin on offer. Every image a model draws is one of these: filed as a
 * `document` entity the moment it exists, whether or not it ever becomes
 * the badge. It keeps everything needed to cast the same badge again — a
 * badge nobody can reproduce could never be regenerated larger, or replaced
 * when one came out wrong.
 *
 * An image an admin uploads by hand is one of these too, and reaches the
 * gallery the same way: there is no second kind of pin, so a hand-made
 * image can be picked, taken off and picked again like any drawn one.
 */
export interface BadgeImage {
	/** The `document` entity wrapping the file, where metadata can hang. */
	documentUid: string;
	name: string;
	/** The ready download URL, as covers have — straight into `<img src>`. */
	filePath: string;
	/**
	 * Where the image came from. Absent means drawn: galleries are full of
	 * entries filed before uploading one was possible.
	 */
	source?: 'drawn' | 'uploaded';
	/**
	 * What the model drew it from. Only a drawn image has these — an
	 * uploaded pin has nothing to cast again.
	 */
	prompt?: string;
	negativePrompt?: string;
	seed?: number;
	styleVersion?: number;
	/**
	 * How much of the collection reached the model. Absent on images drawn
	 * before the levels existed — those came from the rule's style name
	 * alone, and nothing but the prompt text says so.
	 */
	contextLevel?: BadgeContextLevel;
	model?: string;
	/** Epoch milliseconds. */
	generatedAt: number;
}

/**
 * How much a badge knows about the collection it belongs to.
 *
 * - `catalog`: the real records the rule reaches — the majority of their
 *   styles, their earliest year. No extra model call, no extra cost.
 * - `rich`: on top of that, the covers decide the enamel colour and a
 *   recurring object in the album titles earns a second, smaller motif.
 *   The covers are fetched and measured; no model is asked.
 * - `ai`: a text model writes the main motif from the collection's facts,
 *   inside the same fixed style lock. One extra call per badge.
 *
 * A type, not a list: a value exported from this barrel would land in the
 * main bundle, and the only thing that enumerates the levels is the admin
 * page, which is lazy. The list lives there.
 */
export type BadgeContextLevel = 'catalog' | 'rich' | 'ai';

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
	 * Every image ever offered for this collection, oldest first — the one
	 * above among them. Drawing keeps them all rather than three in four
	 * dying with the page, so a later admin can still reach back and make
	 * any of them the badge without paying the model again; an uploaded
	 * image joins them, which is what makes it pickable at all.
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
