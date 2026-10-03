import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ConcertPageStore } from './concert-page.store';
import { toCountdownValue } from './concert.mapper';
import { CONCERT_FILTER_OPTIONS, ConcertFilter } from './concert.model';

/**
 * Where the bands of the catalog are playing.
 *
 * Only the catalog's own artists are here, and that is the point: a programme
 * guide for the whole country would be somebody else's product, while this
 * answers a collector's question — when do I get to see a band whose records
 * are on my shelf.
 *
 * The page only reads. What fills it is loaded in the admin
 * (`loadConcertsFromMusicBrainz`, `suggestConcerts`), and a concert a model
 * proposed only gets here after a person has opened its source and approved it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ConcertPageStore],
	selector: 'mc-concert-page',
	templateUrl: './concert-page.component.html',
	styleUrls: ['./concert-page.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink],
})
export class ConcertPageComponent {
	protected readonly store = inject(ConcertPageStore);

	protected readonly filterOptions = CONCERT_FILTER_OPTIONS;
	protected readonly skeletons = Array.from({ length: 4 }, (_, i) => i);

	protected onFilter(filter: ConcertFilter): void {
		this.store.setFilter(filter);
	}

	protected onCity(event: Event): void {
		this.store.setCity((event.target as HTMLSelectElement).value);
	}

	/** The number the countdown sentence names, when it names one. */
	protected countdownValue(day: string): number | null {
		return toCountdownValue(day, new Date().toISOString().slice(0, 10));
	}

	/**
	 * An artist photo is dropped rather than left broken: the row stands on
	 * the text, the picture is decoration.
	 */
	protected onImageError(event: Event): void {
		(event.target as HTMLImageElement).hidden = true;
	}
}
