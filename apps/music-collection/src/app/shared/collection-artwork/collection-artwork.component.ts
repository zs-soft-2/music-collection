import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

/**
 * The picture that stands for a collection. The curator's own artwork comes
 * first; without it the records themselves say what the set is, as a mosaic
 * of their covers; and when the catalog has no cover to show either, the
 * collection's icon stands in.
 *
 * The host carries the size, so the same symbol works as a thumbnail in a
 * list row and as the artwork of a card.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-artwork',
	template: `
		@if (coverImageUrl(); as url) {
			<img class="cover" [src]="url" alt="" loading="lazy" />
		} @else if (mosaic().length) {
			<div class="mosaic" [attr.data-count]="mosaic().length">
				@for (cover of mosaic(); track cover) {
					<img [src]="cover" alt="" loading="lazy" />
				}
			</div>
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

		.cover,
		.mosaic img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.mosaic {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			width: 100%;
			height: 100%;

			&[data-count='1'] {
				grid-template-columns: 1fr;
			}

			/* Two covers stand side by side, three keep the first whole. */
			&[data-count='3'] img:first-child {
				grid-row: span 2;
			}
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
	/** How many covers the mosaic may show; fewer keeps it readable when small. */
	public readonly limit = input(4);

	protected readonly mosaic = computed(() =>
		this.covers().slice(0, this.limit())
	);
}
