import { TranslocoService } from '@jsverse/transloco';

import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../language.service';
import { CatalogGroup, catalogKey } from './catalog';

/** How a list of catalog values reads on one line. */
const SEPARATOR = ', ';

/**
 * A catalog value in the language in force: `{{ album.format | mcCatalog:
 * 'format' }}`. A list is read the same way and joined: `{{
 * member.instruments | mcCatalog: 'instrument' }}` → "Ének, Gitár".
 *
 * A value the dictionary does not know is shown as it stands rather than as a
 * key. The catalog grows from Discogs, which knows formats, instruments and
 * pressing countries this app has never heard of; an unknown one is better
 * read in English than as `catalog.format.shellac`.
 */
@Pipe({ name: 'mcCatalog', pure: false })
export class McCatalogPipe implements PipeTransform {
	private readonly transloco = inject(TranslocoService);
	private readonly language = inject(LanguageService);

	private memo = '';
	private label = '';

	public transform(
		value: string | readonly string[] | null | undefined,
		group: CatalogGroup
	): string {
		const values = (Array.isArray(value) ? value : [value]).filter(
			(item): item is string => !!item
		);

		if (!values.length) {
			return '';
		}

		const memo = `${this.language.language()}|${group}|${values.join('|')}`;

		if (memo !== this.memo) {
			this.memo = memo;
			this.label = values
				.map((item) => catalogLabel(this.transloco, group, item))
				.join(SEPARATOR);
		}

		return this.label;
	}
}

/**
 * The same lookup outside a template, for the mappers that build a label into
 * a string they hand on.
 */
export function catalogLabel(
	transloco: TranslocoService,
	group: CatalogGroup,
	value: string
): string {
	const key = catalogKey(group, value);
	const translated = transloco.translate<string>(key);

	// Transloco hands back the key itself when nothing matched, in either the
	// active language or the fallback.
	return translated === key ? value : translated;
}
