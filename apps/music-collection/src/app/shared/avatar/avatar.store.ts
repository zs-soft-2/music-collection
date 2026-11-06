import { inject } from '@angular/core';
import { signalStore, withMethods } from '@ngrx/signals';

import { AvatarEffect, type AvatarLayerSize } from '../../data/avatar';

/**
 * The character as the components that draw it reach it: the figure and the
 * editor ask here, never the effect, for where a layer of the wardrobe is
 * drawn from.
 *
 * Holds no state of its own. The look a component draws is its input, and
 * the saved one belongs to the profile page, which keeps it with the rest of
 * the collector's settings.
 */
export const AvatarStore = signalStore(
	{ providedIn: 'root' },
	withMethods((_store, avatarEffect = inject(AvatarEffect)) => ({
		/** Where one layer of the wardrobe is drawn from. */
		layerUrl(file: string, size: AvatarLayerSize = 'large'): string {
			return avatarEffect.layerUrl(file, size);
		},
	}))
);
