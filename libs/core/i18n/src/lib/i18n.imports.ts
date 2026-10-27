import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco';

import { McCatalogPipe } from './catalog/catalog.pipe';
import { McCurrencyPipe } from './pipe/currency.pipe';
import { McDatePipe } from './pipe/date.pipe';
import { McNumberPipe, McPercentPipe } from './pipe/number.pipe';
import { McPluralPipe } from './pipe/plural.pipe';

/**
 * What a template needs to say anything in three languages, in one import.
 *
 * A component adds `...I18N_IMPORTS` and has `t`, `transloco`, `mcDate`,
 * `mcNumber`, `mcPercent`, `mcCurrency`, `mcPlural` and `mcCatalog`. Listing
 * them by hand in every one of the app's components would be the same seven
 * lines ninety times over, and the one that forgets a pipe fails at runtime
 * rather than at build.
 */
export const I18N_IMPORTS = [
	TranslocoDirective,
	TranslocoPipe,
	McDatePipe,
	McNumberPipe,
	McPercentPipe,
	McCurrencyPipe,
	McPluralPipe,
	McCatalogPipe,
] as const;
