import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserSettingsEffect } from '../user-settings';
import { MEASUREMENT_SETTING } from './measurement.setting';

/**
 * The collector's answer to being measured, and the only place it is kept.
 * Everything that measures — and the bar that asks — reads it from here, so
 * a withdrawal takes effect everywhere at once.
 */
@Injectable({ providedIn: 'root' })
export class MeasurementConsentService {
	private readonly settings = inject(UserSettingsEffect);

	/** Null while the question has not been answered (or not loaded yet). */
	public readonly consented = signal<boolean | null>(null);

	public constructor() {
		this.settings
			.value$(MEASUREMENT_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe(({ consented }) => this.consented.set(consented));
	}

	/**
	 * Records the answer. The signal moves first: withdrawing has to stop the
	 * measurement now, not once the account has the change.
	 */
	public decide(consented: boolean): void {
		this.consented.set(consented);

		this.settings
			.save(MEASUREMENT_SETTING, { consented })
			.catch((error) => {
				console.error('Measurement consent not saved', error);
			});
	}
}
