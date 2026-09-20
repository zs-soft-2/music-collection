import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionsPageStore } from './collections-page.store';

/**
 * The published collections with where the collector stands on each: what a
 * collection asks for is resolved against the catalog, so the cards change
 * with it and with the shelf.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionsPageStore],
	selector: 'mc-collections-page',
	templateUrl: './collections-page.component.html',
	styleUrls: ['./collections-page.component.scss'],
	imports: [RouterLink],
})
export class CollectionsPageComponent {
	protected readonly store = inject(CollectionsPageStore);

	protected readonly skeletons = Array.from({ length: 6 }, (_, i) => i);
}
