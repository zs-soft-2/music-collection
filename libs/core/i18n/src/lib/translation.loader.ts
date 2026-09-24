import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { InjectionToken, Injectable, inject } from '@angular/core';

/**
 * The build the dictionaries belong to, appended to their URL.
 *
 * Without it a dictionary is the one file of the app that can go stale: the
 * bundles carry a content hash in their name, `assets/i18n/hu.json` does not,
 * and a browser holding yesterday's copy would show yesterday's wording — or
 * blank labels where a key is new. The app passes its own version in.
 */
export const TRANSLATION_VERSION = new InjectionToken<string>(
	'TRANSLATION_VERSION',
	{ providedIn: 'root', factory: () => '' }
);

/**
 * Fetches a language's dictionary from `assets/i18n`.
 *
 * Over HTTP and not bundled in: three dictionaries in the main bundle would
 * make every visitor download two languages they will not read. This way the
 * browser caches each one it has actually been shown, and a build that
 * changed nothing but the Hungarian wording does not invalidate the app
 * bundle for everybody.
 */
@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
	private readonly http = inject(HttpClient);
	private readonly version = inject(TRANSLATION_VERSION);

	public getTranslation(lang: string): Observable<Translation> {
		const query = this.version
			? `?v=${encodeURIComponent(this.version)}`
			: '';

		return this.http.get<Translation>(`assets/i18n/${lang}.json${query}`);
	}
}
