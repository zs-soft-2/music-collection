import { ViewportScroller } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	DiscographyCardComponent,
	FormatBadgeComponent,
	SpotifyPlayerComponent,
} from '../../shared/music-ui';
import { AlbumPageStore } from './album-page.store';
import { AlbumCreditsComponent } from './component/album-credits/album-credits.component';
import { AlbumTracklistComponent } from './component/album-tracklist/album-tracklist.component';

/**
 * Album page: the album with its original release, tracklist, credits
 * (musicians and their roles), the collector's copies and more albums of the
 * artist.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumPageStore],
	selector: 'mc-album-page',
	templateUrl: './album-page.component.html',
	styleUrls: ['./album-page.component.scss'],
	imports: [
		RouterLink,
		DiscographyCardComponent,
		FormatBadgeComponent,
		AlbumCreditsComponent,
		AlbumTracklistComponent,
		SpotifyPlayerComponent,
	],
})
export class AlbumPageComponent {
	protected readonly store = inject(AlbumPageStore);
	private readonly viewportScroller = inject(ViewportScroller);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);

	public constructor() {
		// Moving to another album of the artist reuses this page.
		effect(() => {
			this.store.albumId();
			untracked(() => this.viewportScroller.scrollToPosition([0, 0]));
		});
	}
}
