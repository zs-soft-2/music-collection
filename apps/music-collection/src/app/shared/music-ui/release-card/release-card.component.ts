import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReleaseView } from '@music-collection/ui/music-view';
import {
	AdminEditEntity,
	AdminEditLinkComponent,
} from '../admin-edit-link/admin-edit-link.component';
import { PlayAlbumButtonComponent } from '../../player/play-album-button.component';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { FormatBadgeComponent } from '../format-badge/format-badge.component';
import { CoverFallbackDirective } from '../../image';

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
		CoverFallbackDirective,
		...I18N_IMPORTS,
		RouterLink,
		FormatBadgeComponent,
		AdminEditLinkComponent,
		PlayAlbumButtonComponent,
		StarRatingComponent,
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
	/**
	 * The collector may file this copy on their drawn shelf. Only their own
	 * collection offers it — a card on someone else's page does not.
	 */
	public readonly canPlace = input(false);
	/** The copy to file, by its collection item id. */
	public readonly place = output<string>();
	/**
	 * The collector may let this copy go — sold, traded, lost. Their own
	 * collection offers it; a card anywhere else does not.
	 */
	public readonly canRemove = input(false);
	/** The copy to let go of, by its collection item id. */
	public readonly remove = output<string>();
	/**
	 * Where the card leads. In the collector's own collection a card is a
	 * copy they own, so it opens that copy; everywhere else — a search, an
	 * artist's discography, someone's wishlist — it is a record in the
	 * catalog, and the album page is what there is to open.
	 */
	public readonly opens = input<'album' | 'copy'>('album');
	/**
	 * What the collector thinks of the record, where they said so. Shown and
	 * not pressed: a verdict is given on the album's own page, where the
	 * record is in front of them — a card in a grid of two hundred is a place
	 * to be reminded, not to judge.
	 */
	public readonly stars = input<number | null>(null);

	protected readonly link = computed((): unknown[] => {
		const release = this.release();

		return this.opens() === 'copy'
			? ['/collection', 'copy', release.id]
			: ['/album', release.albumId];
	});

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
