import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArtistView, ReleaseView } from '../../../../shared/music-ui';

/**
 * Hero of the home page: one artist from the collection, large, with the
 * releases of theirs the collector owns. "Show another" picks a new artist —
 * a deliberate action, not an auto-rotating carousel.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-spotlight',
	templateUrl: './artist-spotlight.component.html',
	styleUrls: ['./artist-spotlight.component.scss'],
	imports: [RouterLink],
})
export class ArtistSpotlightComponent {
	public readonly artist = input.required<ArtistView>();
	public readonly releases = input<ReleaseView[]>([]);
	public readonly releaseCount = input(0);

	public readonly shuffle = output<void>();

	protected readonly meta = computed(() => {
		const artist = this.artist();

		return [
			artist.country,
			artist.formedYear ? `Formed ${artist.formedYear}` : null,
		].filter((part): part is string => !!part);
	});
}
