import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { PlayerStore } from '../../shared/player';

import { RadioPageStore } from './radio-page.store';
import { RadioStationView } from './radio.model';

/**
 * The radio: a record chosen for the collector rather than by them.
 *
 * Spotify and YouTube will both suggest music, but neither knows what stands
 * on this shelf, which compartment it stands in, or which collection it is
 * short of. Every station here is built out of exactly that.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [RadioPageStore],
	selector: 'mc-radio-page',
	templateUrl: './radio-page.component.html',
	styleUrls: ['./radio-page.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink],
})
export class RadioPageComponent {
	protected readonly store = inject(RadioPageStore);
	protected readonly player = inject(PlayerStore);

	protected readonly skeletons = Array.from(
		{ length: 6 },
		(unused, at) => at
	);

	protected play(station: RadioStationView): void {
		this.store.play(station.station, station.label);
	}
}
