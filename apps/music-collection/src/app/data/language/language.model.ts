import { LanguageEnum, isLanguage } from '@music-collection/core/i18n';

import { UserSetting } from '../user-settings';

/**
 * Which language the collector reads the app in. Null while nothing has been
 * stored yet — then whatever this browser asked for stands.
 */
export interface LanguageSettings {
	language: LanguageEnum | null;
}

export const LANGUAGE_SETTING: UserSetting<LanguageSettings> = {
	id: 'language',
	featureKey: 'language-setting',
	/**
	 * The same key `LanguageService` reads before the first paint, holding
	 * the same document. One choice, one place: with a key each, the copy
	 * this layer restores could overrule the one the collector last picked,
	 * and which won would come down to which was read first.
	 */
	storageKey: 'mc-language',
	toValue: (data) => ({
		language: isLanguage(data['language']) ? data['language'] : null,
	}),
	toDocument: ({ language }) => ({ language }),
};
