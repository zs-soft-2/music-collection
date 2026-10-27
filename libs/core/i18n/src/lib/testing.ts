import {
	Translation,
	TranslocoTestingModule,
	TranslocoTestingOptions,
} from '@jsverse/transloco';

import {
	EnvironmentProviders,
	importProvidersFrom,
	makeEnvironmentProviders,
} from '@angular/core';

import * as enDictionary from '../../assets/i18n/en.json';
import { DEFAULT_LANGUAGE, LanguageEnum, LanguageList } from './language';

/**
 * The i18n a component test needs, with real words in it.
 *
 * The real English dictionary by default, not a stub, so that an assertion on
 * what is on screen — "the guest sees Home, Collections, Coming out" — keeps
 * saying what it always said. A stub would turn every such test into an
 * assertion about key names, which is a weaker claim: it would still pass
 * with a key that has no translation behind it.
 *
 * English only. A test asserting on Hungarian wording would break every time
 * a word is improved while proving nothing the English one does not; the
 * three dictionaries are kept in step by `dictionaries.spec.ts` instead.
 *
 * ```ts
 * providers: [provideI18nTesting()]
 * ```
 */
export function provideI18nTesting(
	langs: Partial<Record<LanguageEnum, Translation>> = {
		// Namespace import, not a default one: the workspace compiles with
		// `esModuleInterop: false`, where a JSON module's synthesized default
		// is undefined at runtime and every lookup would quietly fall back to
		// the key.
		en: enDictionary as unknown as Translation,
	},
	options: TranslocoTestingOptions = {}
): EnvironmentProviders {
	return makeEnvironmentProviders([
		importProvidersFrom(
			TranslocoTestingModule.forRoot({
				langs,
				// Every language is loaded up front: a test that switches
				// language must not wait for a fetch that, here, never happens.
				preloadLangs: true,
				...options,
				translocoConfig: {
					availableLangs: LanguageList,
					defaultLang: DEFAULT_LANGUAGE,
					fallbackLang: DEFAULT_LANGUAGE,
					missingHandler: { useFallbackTranslation: true },
					reRenderOnLangChange: true,
					...options.translocoConfig,
				},
			})
		),
	]);
}
