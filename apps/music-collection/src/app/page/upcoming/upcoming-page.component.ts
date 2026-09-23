import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { hasVinyl } from './upcoming.mapper';
import { UpcomingPageStore } from './upcoming-page.store';
import { UPCOMING_FILTER_OPTIONS, UpcomingFilter } from './upcoming.model';

/**
 * What is coming out in the next few weeks, by the artists the catalog
 * already knows. The list is gathered from MusicBrainz once a day
 * (`refreshUpcomingReleases`), so the page only reads it.
 *
 * A reissue counts as much as a new record here — for a collector a vinyl
 * pressing of a 1987 album is the news, not a footnote — but the two are
 * told apart, and the timeline says which pressings are coming at all.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [UpcomingPageStore],
	selector: 'mc-upcoming-page',
	templateUrl: './upcoming-page.component.html',
	styleUrls: ['./upcoming-page.component.scss'],
	imports: [RouterLink],
})
export class UpcomingPageComponent {
	protected readonly store = inject(UpcomingPageStore);

	protected readonly filterOptions = UPCOMING_FILTER_OPTIONS;
	protected readonly skeletons = Array.from({ length: 4 }, (_, i) => i);

	protected onFilter(filter: UpcomingFilter): void {
		this.store.setFilter(filter);
	}

	/** The vinyl pressings are picked out of the format chips. */
	protected isVinyl(format: string): boolean {
		return hasVinyl([format]);
	}

	protected onVinylOnly(): void {
		this.store.toggleVinylOnly();
	}

	/**
	 * An album that is not out yet rarely has a cover on the Cover Art
	 * Archive. When it has none the image is dropped rather than left
	 * broken, and the artist photo behind it shows through.
	 */
	protected onCoverError(event: Event): void {
		(event.target as HTMLImageElement).hidden = true;
	}
}
