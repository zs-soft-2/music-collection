import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AlbumGroup } from '../../home.mapper';

/**
 * One way through the catalog: the albums of a style or of a decade in a row
 * that scrolls sideways, under a heading that says how many there are in all.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-group',
	imports: [RouterLink],
	template: `
		@let item = group();

		<h3 class="label">
			{{ item.label }}
			<span class="count"
				>{{ item.total }}
				{{ item.total === 1 ? 'album' : 'albums' }}</span
			>
		</h3>

		<ul class="row" [attr.aria-label]="item.label">
			@for (album of item.albums; track album.id) {
				<li>
					<a
						class="cover"
						[routerLink]="['/album', album.id]"
						[title]="album.title"
					>
						<span class="art">
							@if (album.coverUrl) {
								<img
									[src]="album.coverUrl"
									alt=""
									loading="lazy"
								/>
							} @else {
								<span class="placeholder" aria-hidden="true"
									>&#9834;</span
								>
							}
						</span>
						<span class="title">{{ album.title }}</span>
						<span class="meta">
							{{ album.artistName }}
							@if (album.year) {
								· {{ album.year }}
							}
						</span>
					</a>
				</li>
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
				flex: 0 0 9.5rem;
				scroll-snap-align: start;
			}
		}

		.cover {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
			color: var(--mc-text);
			text-decoration: none;

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 3px;
			}
		}

		.art {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			aspect-ratio: 1;
			overflow: hidden;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				transition: transform var(--mc-duration-slow) ease;
			}
		}

		.cover:hover .art img,
		.cover:focus-visible .art img {
			transform: scale(1.05);
		}

		.placeholder {
			font-size: 2rem;
			color: var(--mc-text-subtle);
		}

		.title,
		.meta {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.title {
			font-size: 0.85rem;
			font-weight: 600;
		}

		.meta {
			font-size: 0.72rem;
			color: var(--mc-text-muted);
		}

		@media (prefers-reduced-motion: reduce) {
			.art img {
				transition: none;
			}
		}
	`,
})
export class AlbumGroupComponent {
	public readonly group = input.required<AlbumGroup>();
}
