import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	AdminEditLinkComponent,
	ArtistView,
	ReleaseView,
} from '../../../../shared/music-ui';

/**
 * Hero of the home page: one artist, large, with the releases of theirs the
 * collector owns — or, with no collection behind it, the artist as the
 * catalog holds them. "Show another" picks a new artist — a deliberate
 * action, not an auto-rotating carousel.
 *
 * Most weeks it opens on the band of the week, which is the same artist for
 * everybody and says why it is them. Browsing away from them is what "show
 * another" does; the way back is offered while it is not their turn.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-spotlight',
	templateUrl: './artist-spotlight.component.html',
	styleUrls: ['./artist-spotlight.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink, AdminEditLinkComponent],
})
export class ArtistSpotlightComponent {
	public readonly artist = input.required<ArtistView>();
	public readonly releases = input<ReleaseView[]>([]);
	public readonly releaseCount = input(0);
	/** Albums the catalog holds of the artist — what a guest is shown. */
	public readonly albumCount = input(0);
	/** This artist is the band of the week, not one picked while browsing. */
	public readonly weekly = input(false);
	/** Why they are the band of the week; null while browsing. */
	public readonly reasonKey = input<string | null>(null);
	/** Catalog values the reason's sentence names — a year, a title. */
	public readonly reasonParams = input<Record<string, string>>({});
	/** There is a band of the week to go back to, and this is not them. */
	public readonly canReturn = input(false);

	public readonly shuffle = output<void>();
	public readonly showBand = output<void>();

	protected readonly meta = computed(() => {
		const artist = this.artist();

		return [
			artist.country,
			artist.formedYear ? `Formed ${artist.formedYear}` : null,
		].filter((part): part is string => !!part);
	});
}
