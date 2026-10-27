import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

import { CollectionArtworkComponent } from '../collection-artwork';

/**
 * The picture of a collection as a card carries it: the records it is made
 * of, and how much of them is on the shelf.
 *
 * The mosaic turns its covers over, so a set of ninety is not forever its
 * first four, and nothing is drawn on top of them — a cover is somebody's
 * artwork and the point of showing four of them is that they are seen. The
 * pin the collection pays stands in the card's own corner instead, as
 * `mc-collection-pin`.
 *
 * The host carries the width and nothing inside it is in fixed units, so
 * the whole mark scales with one `width`.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-emblem',
	imports: [CollectionArtworkComponent],
	template: `
		<mc-collection-artwork
			class="art"
			aria-hidden="true"
			[coverImageUrl]="artwork()"
			[covers]="covers()"
			[icon]="icon()"
		/>

		@if (share()) {
			<span class="share">{{ percentage() }}%</span>
		}
	`,
	styles: `
		:host {
			display: grid;
			gap: var(--mc-emblem-gap, 0.4rem);
			justify-items: start;
		}

		.art {
			width: 100%;
			aspect-ratio: 1;
			border-radius: var(--mc-emblem-radius, 0.75rem);
			--mc-collection-artwork-icon: var(--mc-emblem-art-icon, 2rem);
		}

		.share {
			font-size: var(--mc-emblem-share-size, 0.8rem);
			font-weight: 700;
			font-variant-numeric: tabular-nums;
			color: var(--mc-text-muted);
		}
	`,
})
export class CollectionEmblemComponent {
	/** Covers of the collection's records: what the mosaic walks. */
	public readonly covers = input<string[]>([]);
	/** The curator's artwork, shown where there are no covers to turn. */
	public readonly coverImageUrl = input<string | null>(null);
	/** PrimeIcons class, for a collection with no picture at all. */
	public readonly icon = input<string | null>(null);
	/** 0–100, as the label under the picture says it. */
	public readonly percentage = input(0);
	/** The percentage under the picture; off where the card says it. */
	public readonly share = input(true);
	/**
	 * The records come before the curator's artwork. A card that already
	 * stands on that artwork asks for this, so the picture is the mosaic
	 * rather than the same artwork twice.
	 */
	public readonly mosaicFirst = input(false);

	/** The artwork, unless the card asked for the records and has them. */
	protected readonly artwork = computed(() =>
		this.mosaicFirst() && this.covers().length ? null : this.coverImageUrl()
	);
}
