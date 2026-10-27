import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEnGb from '@angular/common/locales/en-GB';
import localeHu from '@angular/common/locales/hu';
import {
	EnvironmentProviders,
	inject,
	makeEnvironmentProviders,
	provideAppInitializer,
} from '@angular/core';

import { DEFAULT_LANGUAGE, LanguageList } from './language';
import { LanguageService } from './language.service';
import { TRANSLATION_VERSION, TranslationLoader } from './translation.loader';

export interface I18nOptions {
	/** The build the dictionaries belong to; busts their browser cache. */
	version: string;
	/** Silences Transloco's development warnings in a deployed build. */
	production: boolean;
}

/**
 * Everything the app needs to speak three languages.
 *
 * The date, number and currency data is registered here rather than through
 * `LOCALE_ID`. `LOCALE_ID` is settled at bootstrap and cannot be changed
 * afterwards, which would mean a reload on every switch; the pipes in this
 * library take the locale as an argument instead, and this makes sure the
 * data for all three is loaded whichever one is picked.
 */
export function provideI18n(options: I18nOptions): EnvironmentProviders {
	registerLocaleData(localeHu);
	registerLocaleData(localeEnGb);
	registerLocaleData(localeDe);

	return makeEnvironmentProviders([
		{ provide: TRANSLATION_VERSION, useValue: options.version },
		provideTransloco({
			config: {
				availableLangs: LanguageList,
				defaultLang: DEFAULT_LANGUAGE,
				// A key missing from one language falls back to the same key
				// in the default one. A half-translated screen is worth
				// showing; a screen of raw key names is not.
				fallbackLang: DEFAULT_LANGUAGE,
				missingHandler: { useFallbackTranslation: true },
				// The pipes and directives re-read their key when the language
				// changes, which is what makes the switch take effect without
				// a reload.
				reRenderOnLangChange: true,
				prodMode: options.production,
			},
			loader: TranslationLoader,
		}),
		// The dictionary is fetched before the first screen is drawn. Without
		// this the app would paint its labels blank and fill them a moment
		// later — on every cold load, on every page.
		//
		// A failure is swallowed on purpose. Bootstrap waits on whatever an
		// initializer returns, so a rejected fetch — offline, a bad deploy, a
		// stale service worker — would stop the app from starting at all.
		// A collection shown with key names for labels is a bad screen; a
		// blank one is no screen, and the reader cannot even get to the
		// language switch to try another.
		provideAppInitializer(() => {
			const language = inject(LanguageService).language();

			return firstValueFrom(
				inject(TranslocoService).load(language)
			).catch((error) => {
				console.error(`Dictionary "${language}" not loaded`, error);
			});
		}),
	]);
}
