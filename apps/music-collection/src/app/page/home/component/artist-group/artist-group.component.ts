import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
	ArtistTileComponent,
	CarouselComponent,
} from '../../../../shared/music-ui';
import { ArtistGroup } from '../../home.mapper';

/** The artists of one kind of act, in a row that scrolls sideways. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-group',
	imports: [ArtistTileComponent, CarouselComponent],
	template: `
		@let item = group();

		<h3 class="label">
			{{ item.label }}
			<span class="count">{{ item.total }} in the catalog</span>
		</h3>

		<mc-carousel [label]="item.label">
			@for (artist of item.artists; track artist.id) {
				<li><mc-artist-tile [artist]="artist" /></li>
			}
		</mc-carousel>
	`,
	styles: `
		:host {
			display: block;

			/* A tile is square, so the arrows sit on half a card's width. */
			--mc-carousel-item: 11rem;
			--mc-carousel-nav-top: 5.5rem;
		}

		.label {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.5rem 0.75rem;
			margin: 0 0 0.75rem;
			font-family: var(--mc-font-display);
			font-size: 1.35rem;
			font-weight: 400;
			letter-spacing: 0.02em;
		}

		.count {
			font-family: var(--mc-font-body);
			font-size: 0.75rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		@media (max-width: 720px) {
			:host {
				--mc-carousel-item: 9rem;
				--mc-carousel-nav-top: 4.5rem;
			}
		}
	`,
})
export class ArtistGroupComponent {
	public readonly group = input.required<ArtistGroup>();
}
