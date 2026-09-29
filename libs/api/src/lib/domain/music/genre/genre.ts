import { Entity, GenreName, StyleName } from '../../../common';

/**
 * One genre of the taxonomy with the styles under it — a document of the
 * `genre` collection, and the thing an admin edits.
 *
 * The taxonomy follows Discogs: a genre is broad (`Rock`, `Jazz`), a style
 * narrow (`Thrash`, `Hard Bop`), and every style belongs to exactly one
 * genre. That is also what the imports read, so a name typed here the way
 * Discogs spells it matches by itself.
 */
export interface Genre {
	/** As Discogs spells it, and as the documents store it: `Rock`. */
	name: GenreName;
	/**
	 * Stable key of the genre, lower case and dash-joined (`folk-world-country`).
	 * The name may be corrected; what points at a genre points at this.
	 */
	slug: string;
	/** The styles under the genre, in the order the list is shown. */
	styles: StyleName[];
	/** What the genre covers, for the admin who did not add it. */
	description?: string | null;
	/**
	 * Whether the genre is offered on the forms. A genre nothing on the shelf
	 * carries is kept rather than deleted: its styles are what the catalog
	 * already spelled, and deleting it would orphan them.
	 */
	active?: boolean;
}

export type GenreEntity = Genre & Entity;

export type GenreEntityAdd = Omit<GenreEntity, 'uid'>;

export type GenreEntityUpdate = Partial<GenreEntity> & Entity;

/** The whole taxonomy as the app reads it: every genre, name-ordered. */
export type GenreTaxonomy = GenreEntity[];

/** What the genre form holds; `uid` is empty for a genre being added. */
export interface GenreDraft {
	name: GenreName;
	description: string | null;
	styles: StyleName[];
	active: boolean;
}
