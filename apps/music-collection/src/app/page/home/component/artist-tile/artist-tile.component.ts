import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArtistTileView } from '../../home.mapper';

/** Artist photo tile — the whole tile links to the artist page. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-tile',
	imports: [RouterLink],
	template: `
		@let item = artist();

		<a class="tile" [routerLink]="['/artist', item.id]">
			<span class="photo">
				@if (item.imageUrl) {
					<img [src]="item.imageUrl" alt="" loading="lazy" />
				}
			</span>
			<span class="body">
				<span class="name">{{ item.name }}</span>
				<span class="details">
					{{ item.releaseCount }}
					{{ item.releaseCount === 1 ? 'release' : 'releases' }}
					@if (item.styles.length) {
						· {{ item.styles[0] }}
					}
				</span>
			</span>
		</a>
	`,
	styles: `
		:host {
			display: block;
		}

		.tile {
			position: relative;
			display: block;
			aspect-ratio: 1;
			overflow: hidden;
			color: #fff;
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);
		}

		.tile:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 3px;
		}

		.photo img {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: cover;
			filter: grayscale(60%);
			transition:
				transform var(--mc-duration-slow) ease,
				filter var(--mc-duration-slow) ease;
		}

		.tile:hover .photo img,
		.tile:focus-visible .photo img {
			filter: grayscale(0%);
			transform: scale(1.06);
		}

		.body {
			position: absolute;
			inset: auto 0 0;
			display: flex;
			flex-direction: column;
			gap: 0.1rem;
			padding: 2.5rem 0.8rem 0.75rem;
			background: linear-gradient(
				0deg,
				rgba(0, 0, 0, 0.92) 0%,
				rgba(0, 0, 0, 0.6) 55%,
				transparent 100%
			);
		}

		.name {
			overflow: hidden;
			font-family: var(--mc-font-display);
			font-size: 1.45rem;
			line-height: 1;
			letter-spacing: 0.02em;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.details {
			overflow: hidden;
			font-size: 0.78rem;
			color: #d0d0d0;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		@media (prefers-reduced-motion: reduce) {
			.photo img {
				transition: none;
			}
		}
	`,
})
export class ArtistTileComponent {
	public readonly artist = input.required<ArtistTileView>();
}
