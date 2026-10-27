import { EntityTypeEnum } from '../../../common';

import { GenreEntity } from './genre';
import {
	activeGenres,
	allStyles,
	findGenre,
	genreOfStyle,
	styleOptions,
	stylesOfGenre,
	toGenreSlug,
} from './genre-taxonomy';

const genre = (
	name: string,
	styles: string[],
	fields: Partial<GenreEntity> = {}
): GenreEntity => ({
	active: true,
	description: null,
	entityType: EntityTypeEnum.Genre,
	name,
	slug: toGenreSlug(name),
	styles,
	uid: toGenreSlug(name),
	...fields,
});

const ROCK = genre('Rock', ['Thrash', 'Doom', 'Hard rock']);
const JAZZ = genre('Jazz', ['Hard Bop', 'Free Jazz']);
const TAXONOMY = [ROCK, JAZZ];

describe('toGenreSlug', () => {
	it('is a stable key whatever the name looks like', () => {
		expect(toGenreSlug('Rock')).toBe('rock');
		expect(toGenreSlug('Funk / Soul')).toBe('funk-soul');
		expect(toGenreSlug('Folk, World, & Country')).toBe(
			'folk-world-and-country'
		);
	});
});

describe('activeGenres', () => {
	it('offers the genres by name, leaving out the retired ones', () => {
		const retired = genre('Non-Music', ['Spoken Word'], { active: false });

		expect(
			activeGenres([JAZZ, retired, ROCK]).map(({ name }) => name)
		).toEqual(['Jazz', 'Rock']);
	});

	/** Genres saved before the flag existed carry no `active`. */
	it('offers a genre that says nothing about being active', () => {
		const old = { ...genre('Blues', []), active: undefined };

		expect(activeGenres([old])).toEqual([old]);
	});
});

describe('findGenre', () => {
	it('finds the genre however the name is cased or spaced', () => {
		expect(findGenre(TAXONOMY, 'rock')).toBe(ROCK);
		expect(findGenre(TAXONOMY, '  Rock ')).toBe(ROCK);
	});

	it('finds nothing for a genre the taxonomy does not hold', () => {
		expect(findGenre(TAXONOMY, 'Reggae')).toBeUndefined();
		expect(findGenre(TAXONOMY, null)).toBeUndefined();
	});
});

describe('stylesOfGenre', () => {
	it('answers with the styles under the genre, in its own order', () => {
		expect(stylesOfGenre(TAXONOMY, 'Jazz')).toEqual([
			'Hard Bop',
			'Free Jazz',
		]);
	});

	/** A document written before a genre was renamed names one nobody holds. */
	it('is empty for a genre the taxonomy does not hold', () => {
		expect(stylesOfGenre(TAXONOMY, 'Reggae')).toEqual([]);
	});
});

describe('genreOfStyle', () => {
	it('says which genre a style belongs to', () => {
		expect(genreOfStyle(TAXONOMY, 'hard bop')).toBe(JAZZ);
		expect(genreOfStyle(TAXONOMY, 'Thrash')).toBe(ROCK);
	});

	it('says nothing for a style nobody holds', () => {
		expect(genreOfStyle(TAXONOMY, 'Bossa Nova')).toBeUndefined();
	});
});

describe('allStyles', () => {
	it('names every style once, in alphabetical order', () => {
		expect(allStyles([ROCK, JAZZ, genre('Blues', ['Thrash'])])).toEqual([
			'Doom',
			'Free Jazz',
			'Hard Bop',
			'Hard rock',
			'Thrash',
		]);
	});
});

describe('styleOptions', () => {
	it('narrows the list to the chosen genre', () => {
		expect(styleOptions(TAXONOMY, 'Jazz')).toEqual([
			'Hard Bop',
			'Free Jazz',
		]);
	});

	it('offers everything where no genre narrows it', () => {
		expect(styleOptions(TAXONOMY, null)).toEqual(allStyles(TAXONOMY));
	});

	/**
	 * The reason this exists: a style saved before the taxonomy knew it would
	 * otherwise vanish from the multiselect, and the next save would drop it
	 * from the record without anybody deciding that.
	 */
	it('keeps a style the record carries but the genre does not offer', () => {
		expect(styleOptions(TAXONOMY, 'Jazz', ['Gothenburg'])).toEqual([
			'Hard Bop',
			'Free Jazz',
			'Gothenburg',
		]);
	});

	it('does not offer a carried style twice', () => {
		expect(styleOptions(TAXONOMY, 'Jazz', ['hard bop'])).toEqual([
			'Hard Bop',
			'Free Jazz',
		]);
	});
});
