import { readFileSync } from 'fs';
import { join } from 'path';

import { catalogKey } from '@music-collection/core/i18n';

import {
	INSTRUMENT_GROUPS,
	INSTRUMENT_LIST,
	toCatalogInstrument,
	toCatalogInstruments,
	unlistedInstruments,
} from './instruments';

/**
 * The English dictionary, read rather than imported: an import across
 * libraries by a relative path is what the module boundaries forbid, and the
 * file is not part of any library's public surface.
 */
const dictionary = JSON.parse(
	readFileSync(
		join(__dirname, '../../../../../../core/i18n/assets/i18n/en.json'),
		'utf-8'
	)
) as Record<string, Record<string, Record<string, string>>>;

const labelOf = (instrument: string): string | undefined => {
	const [, group, key] = catalogKey('instrument', instrument).split('.');

	return dictionary['catalog'][group]?.[key];
};

describe('the instrument list', () => {
	/**
	 * The whole point of a closed list: a value on it is a key into the
	 * dictionary, and the three languages are kept in step by
	 * `dictionaries.spec.ts`. An instrument added here and forgotten there
	 * would read in English on every screen, with nothing to say so.
	 */
	it('has a word for every instrument in every language', () => {
		const missing = INSTRUMENT_LIST.filter(
			(instrument) => !labelOf(instrument)
		);

		expect(missing).toEqual([]);
	});

	it('names each instrument once', () => {
		expect([...new Set(INSTRUMENT_LIST)]).toEqual(INSTRUMENT_LIST);
	});

	/** Two values with one key would be one word for two instruments. */
	it('gives each instrument a key of its own', () => {
		const keys = INSTRUMENT_LIST.map((instrument) =>
			catalogKey('instrument', instrument)
		);

		expect([...new Set(keys)]).toHaveLength(keys.length);
	});

	it('offers every instrument in exactly one group', () => {
		const counted = INSTRUMENT_GROUPS.flatMap((group) => group.instruments);

		expect(counted).toHaveLength(INSTRUMENT_LIST.length);
	});
});

describe('toCatalogInstrument', () => {
	it('leaves the spelling the list owns alone', () => {
		expect(toCatalogInstrument('Backing Vocals')).toBe('Backing Vocals');
	});

	it('reads a singular the way MusicBrainz writes it', () => {
		expect(toCatalogInstrument('keyboard')).toBe('Keyboards');
		expect(toCatalogInstrument('drums')).toBe('Drums');
	});

	it('reads a plural the way a credit writes it', () => {
		expect(toCatalogInstrument('Guitars')).toBe('Guitar');
	});

	it('ignores what a credit adds in brackets', () => {
		expect(toCatalogInstrument('Drums (drum set)')).toBe('Drums');
		expect(toCatalogInstrument('Guitar [Lead]')).toBe('Guitar');
	});

	it('keeps an instrument the list has never heard of', () => {
		expect(toCatalogInstrument('Hurdy-Gurdy')).toBe('Hurdy-Gurdy');
	});

	it('says once what two sources say two ways', () => {
		expect(toCatalogInstruments(['Vocals', 'voice', 'Guitars'])).toEqual([
			'Vocals',
			'Guitar',
		]);
	});
});

describe('unlistedInstruments', () => {
	it('finds what the field could not offer again', () => {
		expect(unlistedInstruments(['Guitar', 'Hurdy-Gurdy', 'Drums'])).toEqual(
			['Hurdy-Gurdy']
		);
	});
});
