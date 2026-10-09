import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CoverMosaicComponent } from '../cover-mosaic';

/**
 * The picture that stands for a collection. The curator's own artwork comes
 * first; without it the records themselves say what the set is, as a mosaic
 * of their covers; and when the catalog has no cover to show either, the
 * collection's icon stands in.
 *
 * Which of the three it is, is all this decides — the mosaic is a picture in
 * its own right, with its own rules about turning covers over, and it is
 * `CoverMosaicComponent` that keeps them.
 *
 * The host carries the size, so the same symbol works as a thumbnail in a
 * list row and as the artwork of a card.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-artwork',
	imports: [...I18N_IMPORTS, CoverMosaicComponent],
	template: `
		@if (coverImageUrl(); as url) {
			<img class="cover" [src]="url" alt="" loading="lazy" />
		} @else if (covers().length) {
			<mc-cover-mosaic [covers]="covers()" [limit]="limit()" />
		} @else {
			<i
				class="placeholder"
				[class]="icon() || 'pi pi-box'"
				aria-hidden="true"
			></i>
		}
	`,
	styles: `
		:host {
			position: relative;
			display: block;
			overflow: hidden;
			background: var(--mc-surface-2);
		}

		.cover {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.placeholder {
			position: absolute;
			inset: 0;
			display: grid;
			place-items: center;
			font-size: var(--mc-collection-artwork-icon, 2.5rem);
			color: var(--mc-text-subtle);
		}
	`,
})
export class CollectionArtworkComponent {
	/** Artwork the curator gave the collection; null falls back to covers. */
	public readonly coverImageUrl = input<string | null>(null);
	/** Covers of the collection's records, in the order they are resolved. */
	public readonly covers = input<string[]>([]);
	/** PrimeIcons class shown when there is no picture at all. */
	public readonly icon = input<string | null>(null);
	/** How many covers the mosaic shows; fewer keeps it readable when small. */
	public readonly limit = input(4);
}
