import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionBackdropComponent } from '../../../../shared/collection-backdrop';
import { CollectionEmblemComponent } from '../../../../shared/collection-emblem';
import { CollectionCardView } from '../../collections.model';

/**
 * One collection as a single row: its picture, its name, how far the shelf
 * gets and what that is worth. The compact form of a collection card, for
 * pages whose subject is something else — the home page and the collector's
 * own shelf — with the full cards left to `/collections`.
 *
 * Made of the same parts as the tile, in a line rather than a block: the
 * curator's artwork behind the row, and the records themselves in the
 * emblem. The artwork is a background — it was drawn to be stood on — so
 * it never takes the emblem's place; a row keeps showing the four covers
 * even where the collection has a picture of its own.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-progress',
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		CollectionBackdropComponent,
		CollectionEmblemComponent,
	],
	template: `
		@let item = collection();

		<a
			class="collection"
			[class.is-completed]="item.completed"
			[class.on-art]="!!item.coverImageUrl"
			[routerLink]="['/collections', item.slug]"
		>
			<!--
				Csak a kurátor képe kerül a sor mögé. A borítófal itt
				kimarad: a borítók egy arasszal arrébb, az emblémában
				amúgy is ott vannak, elmosva mögé téve ugyanaz a
				kollekció lenne kétszer egy sorban.
			-->
			@if (item.coverImageUrl) {
				<mc-collection-backdrop [coverImageUrl]="item.coverImageUrl" />
			}

			<mc-collection-emblem
				class="collection-art"
				[covers]="item.covers"
				[coverImageUrl]="item.coverImageUrl"
				[icon]="item.icon"
				[share]="false"
				[mosaicFirst]="true"
			/>
			<span class="collection-name">
				{{ item.name }}
				@if (item.completed && item.badgeName) {
					<span class="collection-badge">
						<i class="pi pi-check" aria-hidden="true"></i>
						{{ item.badgeName }}
					</span>
				}
			</span>
			<span
				class="collection-bar"
				role="progressbar"
				[attr.aria-valuenow]="item.percentage"
				aria-valuemin="0"
				aria-valuemax="100"
				[attr.aria-label]="'Progress on ' + item.name"
			>
				<span
					class="collection-fill"
					[style.width.%]="item.percentage"
				></span>
			</span>
			<span class="collection-counts">
				{{ item.owned }} / {{ item.total }}
				<span class="collection-points">
					{{ item.completed ? item.earnedPoints : item.points }}
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
			position: relative;
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			gap: 0.35rem 0.75rem;
			align-items: center;
			height: 100%;
			overflow: hidden;
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

		/*
		 * A sor minden eleme pozicionált, különben a háttér — ami abszolút,
		 * tehát a pozicionált réteget kapja — ráfeküdne a szövegre.
		 */
		.collection-art,
		.collection-name,
		.collection-bar,
		.collection-counts {
			position: relative;
		}

		/*
		 * A képen álló soron a szöveg világos, témától függetlenül: alatta a
		 * fedés sötét, nem a lap háttere — ugyanaz az alku, mint a csempén.
		 */
		.collection.on-art {
			color: #fff;

			/*
			 * A sort végig olvassák, nem az aljáról: a fedés ezért mindenütt
			 * tart, és csak jobbra enged fel egy keveset, ahol a képből
			 * látszódhat valami.
			 */
			--mc-backdrop-art-shade: linear-gradient(
				90deg,
				rgba(10, 10, 10, 0.9) 0%,
				rgba(10, 10, 10, 0.82) 50%,
				rgba(10, 10, 10, 0.72) 100%
			);

			.collection-counts {
				color: #cfcfcf;
			}

			/* A teljesített sor pontja marad kiemelt: azt szerezték meg. */
			&:not(.is-completed) .collection-points {
				color: #b3b3b3;
			}

			.collection-bar {
				background: rgba(255, 255, 255, 0.22);
			}
		}

		/*
		 * A kép, ami a kollekcióért áll, a név mellett. Akkora, hogy a négy
		 * borító négy felismerhető lemez legyen — bélyegképnyi negyedén négy
		 * folt volt —, és a legtöbb kollekciót csak itt, ebben a sorban
		 * látja valaki.
		 */
		.collection-art {
			grid-row: 1 / span 2;
			grid-column: 1;
			align-self: center;
			width: 4.5rem;

			--mc-emblem-radius: var(--mc-radius-md);
			--mc-emblem-art-icon: 1.75rem;
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
