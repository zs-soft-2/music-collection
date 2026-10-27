import { Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APPEARANCE_SETTING, AppearanceSettings } from '../data/appearance';
import { UserSettingsEffect } from '../data/user-settings';
import { LayoutWidthService } from './layout-width.service';
import { ThemeService } from './theme.service';

/**
 * Ties the look of the app to the account: what the user set on one machine
 * greets them on the next one. The theme and the layout width stay owned by
 * their own services — they have to be in place before the first paint — and
 * this only carries their state to and from the account.
 */
@Injectable({ providedIn: 'root' })
export class AppearanceSyncService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly theme = inject(ThemeService);
	private readonly layoutWidth = inject(LayoutWidthService);

	/**
	 * What the account holds, so that applying it does not save it straight
	 * back. Null until the first value arrives — until then this browser's
	 * state must not overwrite the account's.
	 */
	private stored: AppearanceSettings | null = null;

	public constructor() {
		this.settings
			.value$(APPEARANCE_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe((appearance) => this.apply(appearance));

		effect(() => {
			const current = this.current();

			if (
				!this.stored ||
				(this.stored.theme === current.theme &&
					this.stored.wide === current.wide)
			) {
				return;
			}

			this.persist(current);
		});
	}

	private current(): AppearanceSettings {
		return { theme: this.theme.mode(), wide: this.layoutWidth.isWide() };
	}

	private apply(appearance: AppearanceSettings): void {
		if (appearance.theme) {
			this.theme.mode.set(appearance.theme);
		}

		if (appearance.wide !== null) {
			this.layoutWidth.isWide.set(appearance.wide);
		}

		const current = this.current();

		this.stored = current;

		// Nothing stored yet: what this browser is set to becomes the value.
		if (appearance.theme === null || appearance.wide === null) {
			this.persist(current);
		}
	}

	private persist(appearance: AppearanceSettings): void {
		this.stored = appearance;

		this.settings.save(APPEARANCE_SETTING, appearance).catch((error) => {
			console.error('Appearance not saved', error);
		});
	}
}
