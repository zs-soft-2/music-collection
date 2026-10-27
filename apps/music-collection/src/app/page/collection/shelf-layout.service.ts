import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ShelfLayoutService, ShelfUnitLayout } from '@music-collection/api';

import { UserSettingsEffect } from '../../data/user-settings';

import { SHELF_LAYOUT_SETTING } from './shelf-layout.setting';

/**
 * Hands the drawn furniture to whoever files a copy by hand — the shelf page
 * draws it, the admin form picks a compartment out of it. It is the signed-in
 * collector's own drawing, kept with their settings, and it follows every
 * change they make to it.
 */
@Injectable({ providedIn: 'root' })
export class CollectorShelfLayoutService extends ShelfLayoutService {
	private readonly settings = inject(UserSettingsEffect);

	public units$(): Observable<ShelfUnitLayout[]> {
		return this.settings
			.value$(SHELF_LAYOUT_SETTING)
			.pipe(map(({ units }) => units));
	}
}
