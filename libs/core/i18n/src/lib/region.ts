import { Injectable, computed, inject } from '@angular/core';

import { LanguageService } from './language.service';

/**
 * Country names in the language in force, straight from the browser's own
 * ICU data.
 *
 * There is no list of country names anywhere in this app, and there should
 * not be: `Intl.DisplayNames` already knows all of them in all three
 * languages, and keeping our own copy would mean maintaining 250 names times
 * three to say what the platform says for free.
 *
 * It takes ISO 3166-1 alpha-2 codes — the ones the collector's location and
 * the world atlas are keyed by, not the English names the release catalog
 * spells out. Those go through {@link McCatalogPipe} instead.
 */
@Injectable({ providedIn: 'root' })
export class RegionService {
	private readonly language = inject(LanguageService);

	/**
	 * Rebuilt on a language switch rather than cached forever: a formatter
	 * holds the locale it was made with, so the old one would keep answering
	 * in the old language.
	 */
	private readonly names = computed(() => {
		const locale = this.language.locale();

		try {
			return new Intl.DisplayNames(locale, { type: 'region' });
		} catch {
			// No ICU region data: the codes stand in for the names.
			return null;
		}
	});

	/** The name of a country, or its code where the browser has no name. */
	public name(code: string): string {
		try {
			return this.names()?.of(code) ?? code;
		} catch {
			return code;
		}
	}

	/** Orders names the way the language's own alphabet does. */
	public readonly collator = computed(
		() => new Intl.Collator(this.language.locale(), { sensitivity: 'base' })
	);
}
