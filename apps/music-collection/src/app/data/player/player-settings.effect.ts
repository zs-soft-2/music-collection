import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { PlayerSettingsOverrides } from './player-settings.model';
import { PlayerSettingsRepository } from './player-settings.repository';

/** Loads and saves the user's player settings. */
@Injectable({ providedIn: 'root' })
export class PlayerSettingsEffect {
	private readonly repository = inject(PlayerSettingsRepository);

	public overrides$(): Observable<PlayerSettingsOverrides> {
		return this.repository.overrides$();
	}

	public save(overrides: PlayerSettingsOverrides): Promise<void> {
		return this.repository.save(overrides);
	}
}
