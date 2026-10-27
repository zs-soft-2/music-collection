import { TranslocoService } from '@jsverse/transloco';

import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../language.service';
import { pluralCategory } from '../plural';

/**
 * A counted thing, in the language in force:
 * `{{ total | mcPlural: 'home.group.albums' }}` → "3 albums".
 *
 * The key names a group, not a string: `home.group.albums.one` and
 * `home.group.albums.other`, each holding `{{ count }}` where the number
 * goes. Which one is used comes from `Intl.PluralRules`, so the language
 * decides rather than a `=== 1` written into a template.
 *
 * That is not pedantry. The three languages disagree about this in ways no
 * single rule covers:
 *
 *   1 album   / 2 albums   — English pluralises the noun
 *   1 album   / 2 album    — Hungarian does not, after a number
 *   1 Album   / 2 Alben    — German does, and irregularly
 *
 * A template that appends an `s` gets two of the three wrong.
 */
@Pipe({ name: 'mcPlural', pure: false })
export class McPluralPipe implements PipeTransform {
	private readonly transloco = inject(TranslocoService);
	private readonly language = inject(LanguageService);

	private memo = '';
	private text = '';

	public transform(
		count: number | null | undefined,
		key: string,
		params: Record<string, unknown> = {}
	): string {
		const value = count ?? 0;
		const locale = this.language.locale();
		const memo = `${locale}|${key}|${value}|${JSON.stringify(params)}`;

		if (memo !== this.memo) {
			this.memo = memo;
			this.text = this.transloco.translate<string>(
				`${key}.${pluralCategory(locale, value)}`,
				// Formatted, not raw: a collection of 1 234 records reads
				// "1,234 albums" in English and "1 234 album" in Hungarian,
				// and the bare digits would be the one number on the page
				// written the wrong way round.
				{ count: number(locale, value), ...params }
			);
		}

		return this.text;
	}
}

const formats = new Map<string, Intl.NumberFormat>();

function number(locale: string, count: number): string {
	let format = formats.get(locale);

	if (!format) {
		format = new Intl.NumberFormat(locale);
		formats.set(locale, format);
	}

	return format.format(count);
}
