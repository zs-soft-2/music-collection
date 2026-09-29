import { GenreName, StyleName } from '../../../common';

import { GenreEntity, GenreTaxonomy } from './genre';

/** How a genre's name becomes its stable key: `Folk World & Country` → `folk-world-country`. */
export function toGenreSlug(name: GenreName): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Case- and space-insensitive form, for comparing two names of a style. */
function nameKey(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The genres offered on a form: the active ones, by name. */
export function activeGenres(taxonomy: GenreTaxonomy): GenreEntity[] {
	return taxonomy
		.filter((genre) => genre.active !== false)
		.sort((left, right) => left.name.localeCompare(right.name));
}

/** The genre of a name; undefined where the taxonomy knows none. */
export function findGenre(
	taxonomy: GenreTaxonomy,
	name: GenreName | null | undefined
): GenreEntity | undefined {
	if (!name) {
		return undefined;
	}
	const key = nameKey(name);

	return taxonomy.find((genre) => nameKey(genre.name) === key);
}

/**
 * The styles a genre offers. Empty for a genre the taxonomy does not know,
 * which is what a document written before the genre was renamed carries.
 */
export function stylesOfGenre(
	taxonomy: GenreTaxonomy,
	name: GenreName | null | undefined
): StyleName[] {
	return findGenre(taxonomy, name)?.styles ?? [];
}

/**
 * The genre a style belongs to. A style belongs to one genre, but nothing
 * stops an admin from naming it under two; the first match wins, so the
 * answer stays the same whoever asks.
 */
export function genreOfStyle(
	taxonomy: GenreTaxonomy,
	style: StyleName
): GenreEntity | undefined {
	const key = nameKey(style);

	return taxonomy.find((genre) =>
		genre.styles.some((name) => nameKey(name) === key)
	);
}

/**
 * Every style of the taxonomy, each once, in alphabetical order. This is what
 * an import matches its own names against, and what a form offers where no
 * genre narrows the choice.
 */
export function allStyles(taxonomy: GenreTaxonomy): StyleName[] {
	const seen = new Map<string, StyleName>();

	for (const genre of taxonomy) {
		for (const style of genre.styles) {
			if (!seen.has(nameKey(style))) {
				seen.set(nameKey(style), style);
			}
		}
	}

	return [...seen.values()].sort((left, right) => left.localeCompare(right));
}

/**
 * The styles a form offers for a genre: the genre's own, plus whatever the
 * document already carries from elsewhere. A style typed before the taxonomy
 * moved — or left over from a genre correction — would otherwise disappear
 * from the multiselect and be dropped on the next save.
 */
export function styleOptions(
	taxonomy: GenreTaxonomy,
	genre: GenreName | null | undefined,
	selected: StyleName[] = []
): StyleName[] {
	const options = genre ? stylesOfGenre(taxonomy, genre) : allStyles(taxonomy);
	const known = new Set(options.map(nameKey));
	const extra = selected.filter((style) => !known.has(nameKey(style)));

	return [...options, ...extra.sort((left, right) => left.localeCompare(right))];
}
