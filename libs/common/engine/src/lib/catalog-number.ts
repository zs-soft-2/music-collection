/**
 * Comparing catalog numbers.
 *
 * The number a label prints is the one identifier a photograph of a spine can
 * read, but nobody writes it the same way twice: the Discogs has "SRM-1-1035"
 * where the sleeve has "SRM 1 1035", and a model reading a spine may keep or
 * drop the spaces. Only the letters and digits carry meaning.
 *
 * Mirrors `normalizeCatno` in apps/functions/src/discogs-match.ts, which the
 * server matches Discogs pressings with; the two must keep saying the same
 * thing.
 */

/** The form two catalog numbers are compared in; empty when there is none. */
export function normalizeCatalogNumber(
	catno: string | null | undefined
): string {
	return String(catno ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

export function isSameCatalogNumber(
	one: string | null | undefined,
	other: string | null | undefined
): boolean {
	const normalized = normalizeCatalogNumber(one);

	return normalized !== '' && normalized === normalizeCatalogNumber(other);
}
