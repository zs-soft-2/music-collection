/**
 * A label's Discogs profile, as the `discogsLabelProfile` callable returns
 * it, to fill in the edit form (Load button).
 */
export interface LabelExternalProfile {
	/** Discogs label id. */
	discogsId: number;
	name: string;
	/** Profile text with Discogs markup. */
	description: string | null;
	sites: string[];
	imageUrl: string | null;
	/**
	 * The parent label on Discogs, by name only. The catalog may not have
	 * that label, so the parent stays the admin's to pick.
	 */
	parentName: string | null;
}

/** The form fields an external profile can fill in. */
export type LabelExternalField = Exclude<
	keyof LabelExternalProfile,
	'parentName'
>;

/**
 * One of the labels the searched name found, as the chooser lists them.
 * The catalog's labels come from releases, by name, so the Discogs id is
 * what a load first has to find.
 */
export interface LabelExternalCandidate {
	discogsId: number;
	name: string;
	thumbUrl: string | null;
}

export interface DiscogsLabelProfileRequest {
	labelId: number;
}

export interface DiscogsLabelSearchRequest {
	name: string;
}

export interface DiscogsLabelSearchResponse {
	candidates: LabelExternalCandidate[];
}

/** Callable name of the Discogs label profile lookup. */
export const DISCOGS_LABEL_PROFILE_FUNCTION = 'discogsLabelProfile';

/** Callable name of the Discogs label search. */
export const DISCOGS_LABEL_SEARCH_FUNCTION = 'discogsLabelSearch';

/** The Discogs page of a label. */
export function discogsLabelUrl(labelId: number): string {
	return `https://www.discogs.com/label/${labelId}`;
}
