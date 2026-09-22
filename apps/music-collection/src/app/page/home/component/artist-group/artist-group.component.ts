import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ArtistTileComponent } from '../../../../shared/music-ui';
import { ArtistGroup } from '../../home.mapper';

/** The artists of one kind of act, in a row that scrolls sideways. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-group',
	imports: [ArtistTileComponent],
	template: `
		@let item = group();

		<h3 class="label">
			{{ item.label }}
			<span class="count">{{ item.total }} in the catalog</span>
		</h3>

		<ul class="row" [attr.aria-label]="item.label">
			@for (artist of item.artists; track artist.id) {
				<li><mc-artist-tile [artist]="artist" /></li>
			}
		</ul>
	`,
	styles: `
		:host {
			display: block;
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

		.row {
			display: flex;
			gap: 1rem;
			margin: 0;
			padding: 0 0 0.5rem;
			overflow-x: auto;
			list-style: none;
			scroll-snap-type: x proximity;
			overscroll-behavior-x: contain;

			li {
				flex: 0 0 11rem;
				scroll-snap-align: start;
			}
		}
	`,
})
export class ArtistGroupComponent {
	public readonly group = input.required<ArtistGroup>();
}
