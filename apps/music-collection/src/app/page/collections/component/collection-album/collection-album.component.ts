import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CoverFallbackDirective } from '../../../../shared/image';
import { CollectionAlbumView } from '../../collections.model';

/**
 * One record of a collection, owned or still to find.
 *
 * A record not on the shelf is shown faded rather than left out: the grid
 * is the collection, and the gaps in it are the point. The mark in the
 * corner says which it is without reading anything — a tick for what is
 * here, a plus for what the next trip to the shop could be.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-album',
	imports: [...I18N_IMPORTS, RouterLink, CoverFallbackDirective],
	template: `
		@let item = album();

		<a
			class="album"
			[class.is-owned]="item.owned"
			[routerLink]="['/album', item.albumUid]"
			[queryParams]="origin()"
		>
			<span class="sleeve">
				@if (item.coverUrl) {
					<img
						mcCoverFallback
						[src]="item.coverUrl"
						alt=""
						loading="lazy"
					/>
				} @else {
					<i class="pi pi-image" aria-hidden="true"></i>
				}

				<span class="mark" aria-hidden="true">
					<i [class]="item.owned ? 'pi pi-check' : 'pi pi-plus'"></i>
				</span>
			</span>

			<span class="name">{{ item.albumName }}</span>
			<span class="meta">
				{{ item.artistName }}
				@if (item.year) {
					· {{ item.year }}
				}
			</span>
			<span class="visually-hidden">
				{{
					(item.owned
						? 'ui.collectionDetailPage.state.owned'
						: 'ui.collectionDetailPage.state.missing'
					) | transloco
				}}
			</span>
		</a>
	`,
	styles: `
		:host {
			display: block;
		}

		.album {
			display: flex;
			flex-direction: column;
			color: inherit;
			text-decoration: none;

			&:hover .sleeve,
			&:focus-visible .sleeve {
				border-color: var(--mc-border-strong);
				transform: translateY(-2px);
			}
		}

		.sleeve {
			position: relative;
			display: grid;
			place-items: center;
			aspect-ratio: 1;
			overflow: hidden;
			font-size: 1.75rem;
			color: var(--mc-text-subtle);
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			transition:
				border-color var(--mc-duration-fast) ease,
				transform var(--mc-duration-fast) ease;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			/* A még megszerzendő lemez fakón áll: a hiány egy pillantásra
			   olvasható. */
			.album:not(.is-owned) & img {
				filter: grayscale(1);
				opacity: 0.45;
			}
		}

		.mark {
			position: absolute;
			right: 0.4rem;
			bottom: 0.4rem;
			display: grid;
			place-items: center;
			width: 1.6rem;
			height: 1.6rem;
			font-size: 0.7rem;
			color: var(--mc-text-muted);
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: 999px;

			.is-owned & {
				color: var(--mc-on-accent);
				background: var(--mc-accent);
				border-color: var(--mc-accent);
			}
		}

		.name {
			margin-top: 0.6rem;
			font-size: 0.88rem;
			font-weight: 600;
			line-height: 1.3;
		}

		.meta {
			margin-top: 0.15rem;
			font-size: 0.78rem;
			color: var(--mc-text-muted);
		}

		.visually-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			margin: -1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
			border: 0;
		}

		@media (prefers-reduced-motion: reduce) {
			.sleeve {
				transition: none;
			}
		}
	`,
})
export class CollectionAlbumComponent {
	public readonly album = input.required<CollectionAlbumView>();
	/**
	 * Carried on to the album page, so its trail leads back to this
	 * collection rather than to the shelf.
	 */
	public readonly origin = input<Params | null>(null);
}
