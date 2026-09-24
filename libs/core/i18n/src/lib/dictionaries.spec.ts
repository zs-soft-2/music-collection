import * as de from '../../assets/i18n/de.json';
import * as en from '../../assets/i18n/en.json';
import * as hu from '../../assets/i18n/hu.json';
import { LanguageList } from './language';

/**
 * The three dictionaries, kept in step.
 *
 * With well over a thousand strings in each, nothing but a test keeps them
 * together: a key added to the English file and forgotten in the other two
 * falls back silently, and the German reader sees an English sentence with no
 * warning anywhere. Here it is a red build instead.
 */
type Dictionary = Record<string, unknown>;

const DICTIONARIES: Record<string, Dictionary> = {
	hu: hu as unknown as Dictionary,
	en: en as unknown as Dictionary,
	de: de as unknown as Dictionary,
};

/** Every leaf key, flattened: `nav.home`, `catalog.format.lp`. */
function keysOf(value: unknown, prefix = ''): string[] {
	if (typeof value !== 'object' || value === null) {
		return [prefix];
	}

	return Object.entries(value as Dictionary).flatMap(([key, child]) =>
		keysOf(child, prefix ? `${prefix}.${key}` : key)
	);
}

function valueAt(dictionary: Dictionary, key: string): unknown {
	return key
		.split('.')
		.reduce<unknown>(
			(node, part) => (node as Dictionary | undefined)?.[part],
			dictionary
		);
}

/** The `{{ name }}` placeholders a string expects, in no particular order. */
function placeholdersOf(text: string): string[] {
	return [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
		.map((match) => match[1])
		.sort();
}

describe('dictionaries', () => {
	const reference = keysOf(DICTIONARIES['en']).sort();

	/**
	 * A key cannot be both a word and a group of words. `radio.justIn` as a
	 * string and `radio.justIn.description` beneath it cannot both exist —
	 * whichever is written second silently replaces the other, and the loser
	 * shows on screen as its own key.
	 */
	it('has no key that is both a string and a branch', () => {
		const branches = new Set(
			reference.flatMap((key) => {
				const parts = key.split('.');

				return parts
					.slice(0, -1)
					.map((_, i) => parts.slice(0, i + 1).join('.'));
			})
		);

		expect(reference.filter((key) => branches.has(key))).toEqual([]);
	});

	it('speaks every language the app offers', () => {
		expect(Object.keys(DICTIONARIES).sort()).toEqual(
			[...LanguageList].sort()
		);
	});

	describe.each(Object.keys(DICTIONARIES))('%s', (language) => {
		const dictionary = DICTIONARIES[language];

		it('has exactly the keys English has', () => {
			expect(keysOf(dictionary).sort()).toEqual(reference);
		});

		it('leaves nothing blank', () => {
			const blank = reference.filter((key) => {
				const value = valueAt(dictionary, key);

				return typeof value !== 'string' || value.trim() === '';
			});

			expect(blank).toEqual([]);
		});

		/**
		 * A translation that drops or renames a placeholder renders the
		 * sentence with a hole in it — "Bought for " with no price. Word
		 * order may differ between the languages; the set of names may not.
		 */
		it('keeps the placeholders English uses', () => {
			const mismatched = reference.filter((key) => {
				const ours = valueAt(dictionary, key);
				const theirs = valueAt(DICTIONARIES['en'], key);

				return (
					typeof ours === 'string' &&
					typeof theirs === 'string' &&
					placeholdersOf(ours).join() !==
						placeholdersOf(theirs).join()
				);
			});

			expect(mismatched).toEqual([]);
		});
	});
});
