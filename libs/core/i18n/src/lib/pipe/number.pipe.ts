import { DecimalPipe, PercentPipe } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../language.service';

/**
 * A number in the language in force: `mcNumber` where Angular's own `number`
 * would be used.
 *
 * The separators are the whole point. A collection of 1 234 records is
 * `1,234` in English, `1 234` in Hungarian and `1.234` in German — and that
 * last one reads as "one point two three four" to an English eye.
 *
 * Impure and memoized, for the reasons in {@link McDatePipe}.
 */
@Pipe({ name: 'mcNumber', pure: false })
export class McNumberPipe implements PipeTransform {
	private readonly language = inject(LanguageService);
	private readonly decimal = new DecimalPipe('en-GB');

	private key = '';
	private formatted: string | null = null;

	public transform(
		value: number | string | null | undefined,
		digits?: string
	): string | null {
		const locale = this.language.locale();
		const key = `${locale}|${digits ?? ''}|${value ?? ''}`;

		if (key !== this.key) {
			this.key = key;
			this.formatted = this.decimal.transform(value, digits, locale);
		}

		return this.formatted;
	}
}

/** A percentage in the language in force, `0.42` → `42%`. */
@Pipe({ name: 'mcPercent', pure: false })
export class McPercentPipe implements PipeTransform {
	private readonly language = inject(LanguageService);
	private readonly percent = new PercentPipe('en-GB');

	private key = '';
	private formatted: string | null = null;

	public transform(
		value: number | string | null | undefined,
		digits?: string
	): string | null {
		const locale = this.language.locale();
		const key = `${locale}|${digits ?? ''}|${value ?? ''}`;

		if (key !== this.key) {
			this.key = key;
			this.formatted = this.percent.transform(value, digits, locale);
		}

		return this.formatted;
	}
}
