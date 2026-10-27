import { Observable, tap } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { UserSettingsEffect } from '../user-settings';
import {
	LOCATION_SETTING,
	LocationOwner,
	PublicUserLocation,
	UserLocationSettings,
	toPublicLocation,
} from './user-location.model';
import { UserLocationRepository } from './user-location.repository';

/**
 * What the collector told us about where they are, and how much of it the
 * others see. The two are kept apart on purpose: the settings are the whole
 * truth and stay private, the public document holds only what the chosen
 * level allows.
 */
@Injectable({ providedIn: 'root' })
export class UserLocationEffect {
	private readonly settings = inject(UserSettingsEffect);
	private readonly repository = inject(UserLocationRepository);

	/**
	 * Whether something of this user is published, as far as this session
	 * knows. Null while it has not been seen yet — then withdrawing still
	 * goes through, because being sure is what matters here.
	 */
	private shared: boolean | null = null;

	/** The locations the collectors chose to share. */
	public shared$(): Observable<PublicUserLocation[]> {
		return this.repository.list$();
	}

	public settings$(): Observable<UserLocationSettings> {
		return this.settings
			.value$(LOCATION_SETTING)
			.pipe(
				tap(
					(settings) =>
						(this.shared =
							settings.level !== 'off' && !!settings.countryCode)
				)
			);
	}

	/**
	 * Keeps the choice, then publishes what it allows — or takes the
	 * published document away. Withdrawing runs even when nothing was
	 * shared, so a level turned off always ends with nothing out there.
	 */
	public async save(
		settings: UserLocationSettings,
		owner: LocationOwner
	): Promise<void> {
		await this.settings.save(LOCATION_SETTING, settings);

		const shared = toPublicLocation(settings, owner);

		if (shared) {
			this.shared = true;

			return this.repository.save(shared);
		}

		// Nothing is out there to take away, and a withdrawal leaves a
		// tombstone the other clients would reload for.
		if (this.shared === false) {
			return;
		}

		this.shared = false;

		return this.repository.remove(owner.uid);
	}
}
