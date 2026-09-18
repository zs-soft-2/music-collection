import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminEditLinkComponent } from '../admin-edit-link/admin-edit-link.component';
import { FormatBadgeComponent } from '../format-badge/format-badge.component';
import { DiscographyAlbum } from '../music-ui.model';

/**
 * One album of the discography. Collected albums show the formats owned;
 * the others are shown slightly muted. The whole card links to the album.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-discography-card',
	imports: [RouterLink, FormatBadgeComponent, AdminEditLinkComponent],
	template: `
		@let item = album();

		<a
			class="card"
			[class.owned]="item.ownedFormats.length"
			[routerLink]="['/album', item.id]"
		>
			<span class="cover">
				@if (item.coverUrl) {
					<img [src]="item.coverUrl" alt="" loading="lazy" />
				} @else {
					<span class="placeholder" aria-hidden="true">♪</span>
				}
				@if (item.year) {
					<span class="year">{{ item.year }}</span>
				}
			</span>

			<span class="body">
				<span class="title">{{ item.title }}</span>
				<span class="meta">
					@if (item.albumType) {
						<span class="type">{{ item.albumType }}</span>
					}
					@if (item.styles.length) {
						<span class="style">{{ item.styles.join(' · ') }}</span>
					}
				</span>

				@if (item.ownedFormats.length) {
					<span class="owned-row">
						<span class="owned-label">In your collection</span>
						@for (format of item.ownedFormats; track format) {
							<mc-format-badge [format]="format" />
						}
					</span>
				} @else {
					<span class="not-owned">Not in your collection</span>
				}
			</span>
		</a>

		<mc-admin-edit-link
			class="mc-card-admin"
			variant="icon"
			entity="album"
			[id]="item.id"
			[name]="item.title"
		/>
	`,
	styles: `
		:host {
			position: relative;
			display: block;
			height: 100%;
		}

		.card {
			display: flex;
			flex-direction: column;
			height: 100%;
			overflow: hidden;
			color: var(--mc-text);
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);
			transition:
				transform var(--mc-duration) ease,
				border-color var(--mc-duration) ease;
		}

		.card:hover,
		.card:focus-visible {
			border-color: var(--mc-border-strong);
			transform: translateY(-3px);
		}

		.card:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 3px;
		}

		.card.owned {
			border-color: color-mix(
				in srgb,
				var(--mc-primary) 45%,
				transparent
			);
		}

		.cover {
			position: relative;
			display: block;
			aspect-ratio: 1;
			background: var(--mc-bg-muted);
		}

		.cover img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.card:not(.owned) .cover img {
			filter: grayscale(55%) brightness(0.85);
			transition: filter var(--mc-duration) ease;
		}

		.card:not(.owned):hover .cover img,
		.card:not(.owned):focus-visible .cover img {
			filter: none;
		}

		.placeholder {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			font-size: 2.5rem;
			color: var(--mc-text-subtle);
		}

		.year {
			position: absolute;
			bottom: 0.5rem;
			left: 0.5rem;
			padding: 0.1rem 0.45rem;
			font-family: var(--mc-font-display);
			font-size: 1.25rem;
			letter-spacing: 0.03em;
			color: #fff;
			background: rgba(0, 0, 0, 0.75);
			border-radius: var(--mc-radius-sm);
		}

		.body {
			display: flex;
			flex: 1;
			flex-direction: column;
			gap: 0.35rem;
			padding: 0.75rem 0.9rem 0.9rem;
		}

		.title {
			display: -webkit-box;
			overflow: hidden;
			font-family: var(--mc-font-display);
			font-size: 1.2rem;
			line-height: 1.15;
			letter-spacing: 0.02em;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
		}

		.meta {
			display: flex;
			flex-wrap: wrap;
			gap: 0.3rem 0.5rem;
			align-items: center;
			font-size: 0.75rem;
			color: var(--mc-text-muted);
		}

		.type {
			padding: 0.05rem 0.4rem;
			font-weight: 700;
			letter-spacing: 0.05em;
			color: var(--mc-text);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-sm);
		}

		.owned-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.3rem 0.6rem;
			align-items: center;
			margin-top: auto;
			padding-top: 0.5rem;
			border-top: 1px solid var(--mc-border);
		}

		.owned-label {
			font-size: 0.72rem;
			font-weight: 700;
			color: var(--mc-text);
		}

		.not-owned {
			margin-top: auto;
			padding-top: 0.5rem;
			font-size: 0.72rem;
			color: var(--mc-text-subtle);
			border-top: 1px solid var(--mc-border);
		}

		@media (prefers-reduced-motion: reduce) {
			.card,
			.cover img {
				transition: none;
			}
		}
	`,
})
export class DiscographyCardComponent {
	public readonly album = input.required<DiscographyAlbum>();
}
