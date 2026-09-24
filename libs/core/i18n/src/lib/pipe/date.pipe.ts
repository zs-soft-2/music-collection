import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../language.service';

/**
 * A date in the language in force: `mcDate` where Angular's own `date` would
 * be used.
 *
 * Angular's pipe reads `LOCALE_ID`, which is settled at bootstrap — using it
 * would mean reloading the page to change language. This one takes the locale
 * from the signal instead, so a switch redraws every date on screen.
 *
 * Impure for the same reason: a pure pipe is only re-run when its argument
 * changes, and the language is not one of its arguments. The cost of that is
 * paid back by the memo below — between two language switches this does one
 * string comparison per change detection, not one `Intl` format.
 */
@Pipe({ name: 'mcDate', pure: false })
export class McDatePipe implements PipeTransform {
	private readonly language = inject(LanguageService);
	private readonly date = new DatePipe('en-GB');

	private key = '';
	private formatted: string | null = null;

	public transform(
		value: Date | string | number | null | undefined,
		format = 'mediumDate',
		timezone?: string
	): string | null {
		const locale = this.language.locale();
		const key = `${locale}|${format}|${timezone ?? ''}|${stamp(value)}`;

		if (key !== this.key) {
			this.key = key;
			this.formatted = this.date.transform(
				value,
				format,
				timezone,
				locale
			);
		}

		return this.formatted;
	}
}

/** What identifies the value for the memo; a Date is not its own identity. */
function stamp(value: Date | string | number | null | undefined): string {
	if (value instanceof Date) {
		return String(value.getTime());
	}

	return value === null || value === undefined ? '' : String(value);
}
