import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
	ARTIST_TYPE_OPTIONS,
	ArtistModel,
	ArtistType,
} from '@music-collection/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { OwnedArtistStateService } from '../../../data/owned-artist';
import { PageBreadcrumbComponent } from '../../../shared/page-breadcrumb';
import { OwnedArtistListStore } from './owned-artist-list.store';

/**
 * The collector's own bands: the ones the catalog has never heard of, so a
 * record by them has something to stand under.
 *
 * Adding and editing is the catalog's own artist form, one route further in —
 * the same form the admin fills, writing under the collector instead.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [OwnedArtistListStore],
	selector: 'mc-owned-artist-list',
	templateUrl: './owned-artist-list.component.html',
	styleUrls: ['./owned-artist-list.component.scss'],
	imports: [...I18N_IMPORTS, PageBreadcrumbComponent, RouterLink],
})
export class OwnedArtistListComponent {
	protected readonly store = inject(OwnedArtistListStore);

	/** What the last save said, if it failed after the form had left. */
	protected readonly writeError = inject(OwnedArtistStateService).lastError;

	protected isPending(artist: ArtistModel): boolean {
		return this.store.pendingRemoval()?.uid === artist.uid;
	}

	protected labelOf(artistType: ArtistType | undefined): string {
		return (
			ARTIST_TYPE_OPTIONS.find(
				(option) => option.value === (artistType ?? 'band')
			)?.labelKey ?? 'catalog.artistType.band'
		);
	}

	/** The year of an artist, for the card to show it without a date. */
	protected yearOf(artist: ArtistModel): number | null {
		const formedIn = artist.formedIn ? new Date(artist.formedIn) : null;

		return formedIn && !Number.isNaN(formedIn.valueOf())
			? formedIn.getUTCFullYear()
			: null;
	}
}
