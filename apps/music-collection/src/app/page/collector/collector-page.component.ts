import { of, map } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectorPageStore } from './collector-page.store';

/**
 * One collector's shelf, as anybody who was given the link sees it — signed
 * in or not.
 *
 * The page is a single document and nothing else. It draws titles, covers and
 * names that travelled inside that document rather than looking any of them up
 * in the catalog, which is what keeps a stranger's visit to one read: a
 * visitor has no catalog cached, and this page must not be the reason they
 * download one.
 *
 * Which is also why nothing here is a link into the app. The invitation at the
 * end is: it is what the whole page is for.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectorPageStore],
	selector: 'mc-collector-page',
	templateUrl: './collector-page.component.html',
	styleUrls: ['./collector-page.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink],
})
export class CollectorPageComponent {
	protected readonly store = inject(CollectorPageStore);

	public constructor() {
		this.store.load(
			inject(ActivatedRoute).paramMap.pipe(
				map((params) => params.get('uid') ?? '')
			)
		);
		this.store.watchVisitor(of(undefined));
	}

	/** Fetches the rest of the shelf — the page's only other read. */
	protected showAll(): void {
		this.store.showAlbums(of(undefined));
	}
}
