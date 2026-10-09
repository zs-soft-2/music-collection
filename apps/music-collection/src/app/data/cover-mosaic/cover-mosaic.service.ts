import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserSettingsEffect } from '../user-settings';
import {
	COVER_MOSAIC_SETTING,
	CoverMosaicSettings,
	DEFAULT_COVER_TURN,
	NO_COVER_ROTATION,
} from './cover-mosaic.setting';

/**
 * How the collection mosaics move, for everything that draws one.
 *
 * It is read from the account rather than passed down from the pages: the
 * same mosaic stands on the home page, the collection list and a collection's
 * own header, and how it moves is the collector's answer, not each page's.
 */
@Injectable({ providedIn: 'root' })
export class CoverMosaicService {
	private readonly settings = inject(UserSettingsEffect);
	private readonly current = signal<CoverMosaicSettings>({
		rotateSeconds: NO_COVER_ROTATION,
		turn: DEFAULT_COVER_TURN,
	});

	/** Seconds between two covers swapping; 0 holds the mosaic still. */
	public readonly rotateSeconds = computed(
		() => this.current().rotateSeconds
	);
	/** What one cover changing to the next looks like. */
	public readonly turn = computed(() => this.current().turn);

	public constructor() {
		this.settings
			.value$(COVER_MOSAIC_SETTING)
			.pipe(takeUntilDestroyed())
			.subscribe((mosaic) => this.current.set(mosaic));
	}

	/**
	 * Changes one of the two answers. The mosaics follow at once rather than
	 * waiting for the document to come back, so the profile's own switches
	 * answer immediately.
	 */
	public set(changes: Partial<CoverMosaicSettings>): void {
		const mosaic = { ...this.current(), ...changes };

		this.current.set(mosaic);

		this.settings.save(COVER_MOSAIC_SETTING, mosaic).catch((error) => {
			console.error('Cover mosaic not saved', error);
		});
	}
}
