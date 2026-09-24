/**
 * The languages the app speaks.
 *
 * The code is the one Transloco knows a dictionary by (`assets/i18n/hu.json`)
 * and the one that goes into `<html lang>`. It is deliberately the short tag:
 * a collector picks a language, not a region, and one dictionary serves every
 * region that speaks it.
 */
export enum LanguageEnum {
	hu = 'hu',
	en = 'en',
	de = 'de',
}

/** The order the language picker offers them in. */
export const LanguageList: LanguageEnum[] = [
	LanguageEnum.hu,
	LanguageEnum.en,
	LanguageEnum.de,
];

/**
 * The language a browser gets when it asks for one we do not speak.
 *
 * English rather than Hungarian: an unknown browser is more likely to read
 * English than Hungarian, and every record sleeve in the catalog is in it.
 */
export const DEFAULT_LANGUAGE = LanguageEnum.en;

/**
 * The locale each language formats its dates and numbers by.
 *
 * `en-GB` and not `en-US` on purpose. The collection is European: the prices
 * are in forints and euros, and `03/04/2026` has to mean the third of April
 * here, the way it does in the other two languages. An American reading of
 * the same string would silently mean a different day.
 */
export const LANGUAGE_LOCALES: Record<LanguageEnum, string> = {
	[LanguageEnum.hu]: 'hu-HU',
	[LanguageEnum.en]: 'en-GB',
	[LanguageEnum.de]: 'de-DE',
};

/**
 * What each language calls itself.
 *
 * Endonyms, not translations: someone looking for German in a Hungarian UI
 * scans for "Deutsch", not for "Német". This is the one list that never goes
 * through the dictionary.
 */
export const LANGUAGE_ENDONYMS: Record<LanguageEnum, string> = {
	[LanguageEnum.hu]: 'Magyar',
	[LanguageEnum.en]: 'English',
	[LanguageEnum.de]: 'Deutsch',
};

/** Whether the code is one of ours, narrowed so it can be assigned. */
export function isLanguage(value: unknown): value is LanguageEnum {
	return (
		typeof value === 'string' && (LanguageList as string[]).includes(value)
	);
}

/**
 * The language behind a browser tag, or null for one we do not speak.
 *
 * Only the primary subtag is looked at: `de-AT` and `de-CH` both read the
 * German dictionary, and a browser set to `en-US` gets English rather than
 * falling through to the default by accident.
 */
export function languageOf(
	tag: string | null | undefined
): LanguageEnum | null {
	const primary = (tag ?? '').toLowerCase().split('-')[0];

	return isLanguage(primary) ? primary : null;
}
