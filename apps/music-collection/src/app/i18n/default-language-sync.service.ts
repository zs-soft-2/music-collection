import { LanguageService } from '@music-collection/core/i18n';

import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DefaultLanguageEffect } from '../data/default-language';

/**
 * Brings the app's default language down from the server and hands it to
 * `LanguageService`, which applies it only to readers who have not picked
 * one for themselves.
 *
 * It is a service of its own rather than a line in `LanguageSyncService`
 * because the two answer different questions: that one carries *this*
 * collector's choice to and from their account, this one carries what an
 * administrator decided for everybody. They also arrive at different times
 * and, when they disagree, the collector wins — which is a rule worth having
 * in one readable place rather than spread across a pair of subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class DefaultLanguageSyncService {
	private readonly effect = inject(DefaultLanguageEffect);
	private readonly language = inject(LanguageService);

	public constructor() {
		this.effect
			.value$()
			.pipe(takeUntilDestroyed())
			.subscribe((language) => {
				if (language) {
					this.language.applyDefault(language);
				}
			});
	}
}
