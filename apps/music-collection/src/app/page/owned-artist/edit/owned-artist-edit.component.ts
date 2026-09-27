import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ArtistStateService } from '@music-collection/api';
import { TextService } from '@music-collection/core/i18n';
import { ArtistFormModule } from '@music-collection/domain/artist';

import { OwnedArtistStateService } from '../../../data/owned-artist';
import {
	Crumb,
	PageBreadcrumbComponent,
} from '../../../shared/page-breadcrumb';

/**
 * A band of the collector's own, in the catalog's own artist form.
 *
 * It is the same component the admin fills — the MusicBrainz lookup, the
 * styles, the duplicate warning and all — and the only thing that differs is
 * where it writes. The form talks to `ArtistStateService`, so swapping that
 * one service for the collector's side is the whole of it: the form knows
 * nothing about owned entities, and needs to know nothing.
 *
 * The service is taken by `useExisting` rather than built here: it lives at
 * the root, because the form navigates away the moment it saves.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{ provide: ArtistStateService, useExisting: OwnedArtistStateService },
	],
	selector: 'mc-owned-artist-edit',
	templateUrl: './owned-artist-edit.component.html',
	styleUrls: ['./owned-artist-edit.component.scss'],
	imports: [ArtistFormModule, PageBreadcrumbComponent],
})
export class OwnedArtistEditComponent {
	private readonly route = inject(ActivatedRoute);
	private readonly text = inject(TextService);

	/** `0` is the new band, the way the admin's editor names it. */
	protected readonly isNew =
		(this.route.snapshot.params['artistId'] ?? '0') === '0';

	protected readonly trail = computed<Crumb[]>(() => {
		const translate = this.text.translator();

		return [
			{ label: translate('nav.owned-artists'), link: '/my-bands/list' },
			{
				label: translate(
					this.isNew
						? 'page.owned-artist.new-band'
						: 'page.owned-artist.edit-band'
				),
			},
		];
	});
}
