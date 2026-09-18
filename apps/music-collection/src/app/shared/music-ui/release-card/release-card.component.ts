import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReleaseView } from '../music-ui.model';
import {
	AdminEditEntity,
	AdminEditLinkComponent,
} from '../admin-edit-link/admin-edit-link.component';
import { PlayAlbumButtonComponent } from '../../player/play-album-button.component';
import { FormatBadgeComponent } from '../format-badge/format-badge.component';

/**
 * Visual release card: the sleeve slides aside on hover / keyboard focus and
 * reveals the physical medium (vinyl record, CD, cassette, DVD). The whole card
 * is one link to the album page, so it holds no nested interactive elements.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-card',
	templateUrl: './release-card.component.html',
	styleUrls: ['./release-card.component.scss'],
	imports: [
		RouterLink,
		FormatBadgeComponent,
		AdminEditLinkComponent,
		PlayAlbumButtonComponent,
	],
})
export class ReleaseCardComponent {
	public readonly release = input.required<ReleaseView>();
	/** Above-the-fold cards load their cover eagerly (LCP). */
	public readonly priority = input(false);
	/**
	 * Which record the admin edit icon opens: the collected copy by default,
	 * the wishlist item on the wishlist.
	 */
	public readonly adminEntity = input<AdminEditEntity>('collection-item');

	protected readonly ariaLabel = computed(() => {
		const release = this.release();
		const parts = [release.artistName, release.title];

		if (release.year) {
			parts.push(String(release.year));
		}
		return parts.join(' — ');
	});

	/** Picture discs show the artwork on the record itself. */
	protected readonly recordBackground = computed(() => {
		const release = this.release();

		return release.pictureDisc && release.coverUrl
			? `center / cover no-repeat url("${release.coverUrl}")`
			: null;
	});
}
