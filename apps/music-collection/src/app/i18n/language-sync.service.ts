import { LanguageService } from '@music-collection/core/i18n';

import { Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LANGUAGE_SETTING, LanguageSettings } from '../data/language';
import { UserSettingsEffect } from '../data/user-settings';

/**
 * Ties the language to the account: what the collector picked on one machine
 * greets them on the next one.
 *
 * The choice itself stays owned by `LanguageService` — it has to be in place
 * before the first paint, which is long before Firestore answers — and this
 * only carries it to and from the account. The same division as
 * `AppearanceSyncService`, for the same reason.
 *
 * What it will not do is invent a choice. An account with no language means
 * the collector has not said, and must go on being offered the app's default
 * (`DefaultLanguageSyncService`); writing whatever their browser happened to
 * ask for into the account would turn that silence into a decision they never
 * made, and quietly opt them out of the default for good.
 */
@Injectable({ providedIn: 'root' })
export class LanguageSyncService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly language = inject(LanguageService);

	/**
	 * What the account holds, so that applying it does not save it straight
	 * back. Null until the first value arrives — until then this browser's
	 * language must not overwrite the account's.
	 */
	private stored: LanguageSettings | null = null;

	public constructor() {
		this.settings
			.value$(LANGUAGE_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe((settings) => this.apply(settings));

		effect(() => {
			const current = this.current();

			// Only a real pick is worth saving, and only once the account has
			// answered: before that there is nothing to compare against.
			if (
				!current.language ||
				!this.stored ||
				this.stored.language === current.language
			) {
				return;
			}

			this.persist(current);
		});
	}

	/** The collector's pick, or null while they have not made one. */
	private current(): LanguageSettings {
		return {
			language: this.language.chosen() ? this.language.language() : null,
		};
	}

	private apply(settings: LanguageSettings): void {
		// A language on the account *is* a pick — made here or on another
		// machine — so it outranks the app's default, and `choose` says so.
		if (settings.language) {
			this.language.choose(settings.language);
		}

		this.stored = settings;
	}

	private persist(settings: LanguageSettings): void {
		this.stored = settings;

		this.settings.save(LANGUAGE_SETTING, settings).catch((error) => {
			console.error('Language not saved', error);
		});
	}
}
