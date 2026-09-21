/**
 * Comparing the names the catalog holds.
 *
 * The same record reaches the catalog by two roads — an admin types it in,
 * or the Discogs import creates it as `discogs-{id}` — and nothing joins
 * them, so "Testament" and "Testament (2)" become two artists and the albums
 * beneath them two albums. A collection resolved against that asks for both,
 * and the badge behind it can never be earned.
 *
 * The comparison has to forgive what the two roads disagree about and
 * nothing more: the Discogs disambiguation number, accents, punctuation, a
 * leading article and an ampersand written out.
 */

/** "Testament (2)" — Discogs numbers same-named acts; the number is not a name. */
export function stripDiscogsSuffix(name: string): string {
	return String(name ?? '')
		.replace(/\s*\(\d+\)\s*$/, '')
		.trim();
}

/**
 * The form two catalog names are compared in. Mirrors `normalize` in
 * tools/discogs/discogs-mapping.mjs, which the importer matches against the
 * catalog with; the two must keep saying the same thing.
 */
export function normalizeCatalogName(name: string): string {
	return stripDiscogsSuffix(name)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/^the\s+/, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

export function isSameCatalogName(one: string, other: string): boolean {
	const normalized = normalizeCatalogName(one);

	return normalized !== '' && normalized === normalizeCatalogName(other);
}

/**
 * The groups of items the catalog cannot tell apart, largest first. Items
 * whose name normalises to nothing are left out: they are a different
 * problem.
 */
export function duplicateCatalogNames<T>(
	items: readonly T[],
	nameOf: (item: T) => string
): T[][] {
	const groups = new Map<string, T[]>();

	for (const item of items) {
		const key = normalizeCatalogName(nameOf(item));

		if (key === '') {
			continue;
		}

		const group = groups.get(key);

		if (group) {
			group.push(item);
		} else {
			groups.set(key, [item]);
		}
	}

	return [...groups.values()]
		.filter((group) => group.length > 1)
		.sort((a, b) => b.length - a.length);
}
