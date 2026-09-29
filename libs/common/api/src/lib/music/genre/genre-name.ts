/**
 * What the catalog stores about a genre and a style: their names.
 *
 * Both used to be enums here — one genre, `Rock`, and a flat list of the
 * fifty-odd styles under it. The taxonomy now lives in Firestore
 * (`genre/{uid}`), where an admin adds a genre or a style without a release,
 * so the shelf can hold a jazz record too. What a document carries is
 * therefore a name, not a member of a list this code knows.
 *
 * The names are the ones Discogs uses (`Rock`, `Electronic`, `Thrash`), as
 * that is where the imports read them from: a name matched loosely
 * (`toCatalogStyle`) is the only join between a source and the taxonomy.
 */
export type GenreName = string;

/** A style under a genre (`genre/{uid}.styles`), e.g. `Thrash`. */
export type StyleName = string;
