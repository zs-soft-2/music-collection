import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { UserSettingsRepository } from '../user-settings';
import {
	PLAYER_SETTING,
	PlayerSettingsOverrides,
} from './player-settings.model';

/**
 * The user's player settings: one of the settings kept for the account
 * (`user/{uid}/setting/player`) when signed in, in this browser otherwise.
 */
@Injectable({ providedIn: 'root' })
export class PlayerSettingsRepository {
	private readonly settings = inject(UserSettingsRepository);

	public overrides$(): Observable<PlayerSettingsOverrides> {
		return this.settings.value$(PLAYER_SETTING);
	}

	public save(overrides: PlayerSettingsOverrides): Promise<void> {
		return this.settings.save(PLAYER_SETTING, overrides);
	}
}
