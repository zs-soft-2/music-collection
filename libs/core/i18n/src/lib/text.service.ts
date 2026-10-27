import { TranslocoService } from '@jsverse/transloco';

import { Injectable, computed, inject } from '@angular/core';

import { CatalogGroup } from './catalog/catalog';
import { catalogLabel } from './catalog/catalog.pipe';
import { LanguageService } from './language.service';
import { pluralCategory } from './plural';

/** Turns a catalog value into the word for it: `('media', 'cd')` → "CD". */
export type CatalogLabeller = (group: CatalogGroup, value: string) => string;

export type Translator = (
	key: string,
	params?: Record<string, unknown>
) => string;

export type Pluralizer = (
	key: string,
	count: number,
	params?: Record<string, unknown>
) => string;

/**
 * Words for the places a pipe cannot reach: a store computing a list of
 * headings, a mapper joining three things into one subtitle, a component
 * announcing a result count to a screen reader.
 *
 * Every member is a `computed` holding a *function*, which is the point.
 * `TranslocoService.translate` is an ordinary call and reads no signal, so a
 * `computed` built on it directly would keep its first answer for the life of
 * the page, and a language switch would leave half the screen behind. Reading
 * `translator()` makes the language a dependency of the computed doing the
 * reading, and the function handed back is rebuilt on every switch.
 *
 * ```ts
 * readonly rows = computed(() => {
 *   const label = this.text.catalog();
 *
 *   return items().map((item) => ({ ...item, format: label('media', item.format) }));
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TextService {
	private readonly transloco = inject(TranslocoService);
	private readonly language = inject(LanguageService);

	/** One key, in the language in force. */
	public readonly translator = computed<Translator>(() => {
		this.language.language();

		return (key, params) => this.transloco.translate<string>(key, params);
	});

	/**
	 * A counted thing: `plural('collection.albums', 3)` picks
	 * `collection.albums.other` and fills in a formatted `{{ count }}`. The
	 * template pipe `mcPlural` does the same; this is for the code that has
	 * to build the string rather than show it.
	 */
	public readonly pluralizer = computed<Pluralizer>(() => {
		const locale = this.language.locale();

		return (key, count, params) =>
			this.transloco.translate<string>(
				`${key}.${pluralCategory(locale, count)}`,
				{
					count: new Intl.NumberFormat(locale).format(count),
					...params,
				}
			);
	});

	/** A word of one of the catalog's own vocabularies. */
	public readonly catalog = computed<CatalogLabeller>(() => {
		this.language.language();

		return (group, value) => catalogLabel(this.transloco, group, value);
	});
}
