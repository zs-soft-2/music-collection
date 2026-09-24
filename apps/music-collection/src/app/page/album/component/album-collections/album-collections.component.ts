import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { AlbumCollectionView } from '../../album.mapper';

/**
 * What this record is part of. A collection is a rule, so the same album can
 * belong to several — and each says where the collector stands with it,
 * which is the only reason the chip is worth the room it takes.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-collections',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		<p class="label">{{ 'ui.albumCollections.part-of' | transloco }}</p>
		<ul class="collections">
			@for (collection of collections(); track collection.uid) {
				<li>
					<a
						class="collection"
						[class.is-completed]="collection.completed"
						[class.is-missing]="!collection.ownsThisAlbum"
						[routerLink]="['/collections', collection.slug]"
					>
						<span class="name">{{ collection.name }}</span>
						<span class="progress">
							{{ collection.owned }} / {{ collection.total }}
						</span>
						@if (collection.completed && collection.badgeName) {
							<span class="badge">
								<i class="pi pi-check" aria-hidden="true"></i>
								{{ collection.badgeName }}
							</span>
						} @else if (!collection.ownsThisAlbum) {
							<span class="missing">{{
								'ui.albumCollections.missing-this-one'
									| transloco
							}}</span>
						}
					</a>
				</li>
			}
		</ul>
	`,
	styles: `
		:host {
			display: block;
			margin-top: 0.75rem;
		}

		.label {
			margin: 0 0 0.35rem;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.collections {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.collection {
			display: inline-flex;
			align-items: center;
			gap: 0.45rem;
			padding: 0.3rem 0.7rem;
			font-size: 0.8rem;
			color: var(--mc-text);
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;

			&:hover {
				border-color: var(--mc-primary);
			}

			&.is-completed {
				border-color: var(--mc-accent);
			}
		}

		.name {
			font-weight: 600;
		}

		.progress {
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		.badge {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
			color: var(--mc-accent);
		}

		.missing {
			color: var(--mc-primary);
		}
	`,
})
export class AlbumCollectionsComponent {
	public readonly collections = input.required<AlbumCollectionView[]>();
}
