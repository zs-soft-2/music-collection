import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionArtworkComponent } from '../../../../shared/collection-artwork';
import { CollectionCardView } from '../../collections.model';

/**
 * One collection as a single row: its picture, its name, how far the shelf
 * gets and what that is worth. The compact form of a collection card, for
 * pages whose subject is something else — the home page and the collector's
 * own shelf — with the full cards left to `/collections`.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-progress',
	imports: [...I18N_IMPORTS, RouterLink, CollectionArtworkComponent],
	template: `
		<a
			class="collection"
			[class.is-completed]="collection().completed"
			[routerLink]="['/collections', collection().slug]"
		>
			<mc-collection-artwork
				class="collection-art"
				[coverImageUrl]="collection().coverImageUrl"
				[covers]="collection().covers"
				[icon]="collection().icon"
			/>
			<span class="collection-name">
				{{ collection().name }}
				@if (collection().completed && collection().badgeName) {
					<span class="collection-badge">
						<i class="pi pi-check" aria-hidden="true"></i>
						{{ collection().badgeName }}
					</span>
				}
			</span>
			<span
				class="collection-bar"
				role="progressbar"
				[attr.aria-valuenow]="collection().percentage"
				aria-valuemin="0"
				aria-valuemax="100"
				[attr.aria-label]="'Progress on ' + collection().name"
			>
				<span
					class="collection-fill"
					[style.width.%]="collection().percentage"
				></span>
			</span>
			<span class="collection-counts">
				{{ collection().owned }} / {{ collection().total }}
				<span class="collection-points">
					{{
						collection().completed
							? collection().earnedPoints
							: collection().points
					}}
					pts
				</span>
			</span>
		</a>
	`,
	styles: `
		:host {
			display: block;
		}

		.collection {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			gap: 0.35rem 0.75rem;
			align-items: center;
			height: 100%;
			padding: 0.85rem 1rem;
			color: inherit;
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);

			&:hover {
				border-color: var(--mc-border-strong);
			}

			&.is-completed {
				border-color: var(--mc-accent);
			}
		}

		/* The picture that stands for the set, next to its name. */
		.collection-art {
			grid-row: 1 / span 2;
			grid-column: 1;
			align-self: center;
			width: 3.25rem;
			height: 3.25rem;
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			--mc-collection-artwork-icon: 1.25rem;
		}

		.collection-name {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;
			font-weight: 600;
		}

		.collection-badge {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--mc-accent);
		}

		.collection-counts {
			grid-row: 1;
			grid-column: 3;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		.collection-bar {
			grid-column: 2 / -1;
			height: 6px;
			overflow: hidden;
			background: var(--mc-surface-2);
			border-radius: 999px;
		}

		.collection-fill {
			display: block;
			height: 100%;
			background: var(--mc-primary);
			border-radius: inherit;

			.is-completed & {
				background: var(--mc-accent);
			}
		}

		.collection-points {
			display: block;
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
			text-align: right;
		}

		.is-completed .collection-points {
			color: var(--mc-accent);
		}
	`,
})
export class CollectionProgressComponent {
	public readonly collection = input.required<CollectionCardView>();
}
