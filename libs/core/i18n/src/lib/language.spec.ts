import {
	DEFAULT_LANGUAGE,
	LANGUAGE_ENDONYMS,
	LANGUAGE_LOCALES,
	LanguageEnum,
	LanguageList,
	isLanguage,
	languageOf,
} from './language';

describe('language', () => {
	it('gives every language it lists a locale and a name of its own', () => {
		for (const language of LanguageList) {
			expect(LANGUAGE_LOCALES[language]).toBeTruthy();
			expect(LANGUAGE_ENDONYMS[language]).toBeTruthy();
		}
	});

	it('formats English the European way', () => {
		// en-US would read 03/04/2026 as the fourth of March, where both of
		// the other languages read it as the third of April.
		expect(LANGUAGE_LOCALES[LanguageEnum.en]).toBe('en-GB');
	});

	describe('isLanguage', () => {
		it('knows the ones we speak', () => {
			expect(isLanguage('hu')).toBe(true);
			expect(isLanguage('de')).toBe(true);
		});

		it('turns down anything else', () => {
			expect(isLanguage('fr')).toBe(false);
			expect(isLanguage('HU')).toBe(false);
			expect(isLanguage(null)).toBe(false);
			expect(isLanguage(undefined)).toBe(false);
			expect(isLanguage(42)).toBe(false);
		});
	});

	describe('languageOf', () => {
		it('reads a bare tag', () => {
			expect(languageOf('hu')).toBe(LanguageEnum.hu);
		});

		/** `de-AT` and `de-CH` both read the German dictionary. */
		it('ignores the region', () => {
			expect(languageOf('de-AT')).toBe(LanguageEnum.de);
			expect(languageOf('en-US')).toBe(LanguageEnum.en);
			expect(languageOf('hu-HU')).toBe(LanguageEnum.hu);
		});

		it('does not mind how it is cased', () => {
			expect(languageOf('DE-at')).toBe(LanguageEnum.de);
		});

		it('says nothing for a language we do not speak', () => {
			expect(languageOf('fr-FR')).toBeNull();
			expect(languageOf('')).toBeNull();
			expect(languageOf(null)).toBeNull();
		});
	});

	it('falls back to a language most visitors can read', () => {
		expect(DEFAULT_LANGUAGE).toBe(LanguageEnum.en);
	});
});
