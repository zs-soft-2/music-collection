import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { UserSetting } from './user-settings.model';
import { UserSettingsRepository } from './user-settings.repository';

/** Loads and saves one of the user's settings. */
@Injectable({ providedIn: 'root' })
export class UserSettingsEffect {
	private readonly repository = inject(UserSettingsRepository);

	public value$<T>(setting: UserSetting<T>): Observable<T> {
		return this.repository.value$(setting);
	}

	public save<T>(setting: UserSetting<T>, value: T): Promise<void> {
		return this.repository.save(setting, value);
	}
}
