import {
	CountryEnum,
	Entity,
	FormatEnum,
	StyleEnum,
} from '@music-collection/common/api';

export type MusicCollectionStatus = 'draft' | 'published';

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
	styles?: EnumCriterion<StyleEnum>;
	/** Styles of the artist, which may be decades apart from the album's. */
	artistStyles?: EnumCriterion<StyleEnum>;
	/** `lp` for studio albums; a collection may take in `ep` or `live` too. */
	albumFormats?: EnumCriterion<FormatEnum>;
	artists?: ReferenceCriterion;
	/** Where the artist is from, not where the pressing was made. */
	artistCountries?: EnumCriterion<CountryEnum>;
	credits?: CreditCriterion;
}

/** The reward for owning every album of the collection. */
export interface BadgeDefinition {
	name: string;
	description: string | null;
	/** PrimeIcons class, as the admin navigation uses them. */
	icon: string | null;
	artworkUrl: string | null;
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
	/** Parent in the collection tree; null at the top. */
	parentUid: string | null;
	status: MusicCollectionStatus;
	visibility: MusicCollectionVisibility;
	/** Null for the curated collections; set for a tenant's own. */
	ownerTenantId: string | null;
	/** Epoch milliseconds. */
	createdAt: number;
	/** Raised whenever the criteria change; resolved membership carries it. */
	criteriaVersion: number;
}

export type MusicCollectionEntity = MusicCollection & Entity;

export type MusicCollectionEntityAdd = Omit<MusicCollectionEntity, 'uid'>;

export type MusicCollectionEntityUpdate = Partial<MusicCollectionEntity> &
	Entity;
