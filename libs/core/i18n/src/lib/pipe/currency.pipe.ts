import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../language.service';

/** What a copy was bought in when the record does not say. */
const FALLBACK_CURRENCY = 'HUF';

/**
 * A price in the language in force.
 *
 * The currency is a property of the purchase, not of the reader: a record
 * bought for 8 000 Ft stays 8 000 Ft in every language, because that is what
 * was handed over at the fair. What the language changes is only how the
 * amount is written — `8000 Ft`, `HUF 8,000`, `8.000 Ft` — never the amount
 * and never the currency. Nothing here converts anything.
 *
 * Impure and memoized, for the reasons in {@link McDatePipe}.
 */
@Pipe({ name: 'mcCurrency', pure: false })
export class McCurrencyPipe implements PipeTransform {
	private readonly language = inject(LanguageService);
	private readonly currency = new CurrencyPipe('en-GB');

	private key = '';
	private formatted: string | null = null;

	public transform(
		value: number | string | null | undefined,
		currencyCode: string | null | undefined = FALLBACK_CURRENCY,
		display: 'code' | 'symbol' | 'symbol-narrow' = 'symbol',
		digits?: string
	): string | null {
		const locale = this.language.locale();
		const code = currencyCode || FALLBACK_CURRENCY;
		const key = `${locale}|${code}|${display}|${digits ?? ''}|${value ?? ''}`;

		if (key !== this.key) {
			this.key = key;
			this.formatted = this.currency.transform(
				value,
				code,
				display,
				// Forints and yen have no minor unit; asking for two decimals
				// would invent "8 000,00 Ft", which no Hungarian price tag
				// has ever said.
				digits ?? digitsFor(code),
				locale
			);
		}

		return this.formatted;
	}
}

/** Currencies the app meets that are not written with decimals. */
const WHOLE_UNIT_CURRENCIES = new Set(['HUF', 'JPY', 'KRW', 'ISK', 'CLP']);

function digitsFor(code: string): string | undefined {
	return WHOLE_UNIT_CURRENCIES.has(code) ? '1.0-0' : undefined;
}
