import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionBackdropComponent } from '../../../../shared/collection-backdrop';
import { CollectionEmblemComponent } from '../../../../shared/collection-emblem';
import { CollectionPinComponent } from '../../../../shared/collection-pin';
import { CollectionTileView } from '../../home.model';

/** How many faces fit on a tile beside the counts. */
const FACES = 3;

/**
 * One collection as a card: the smaller form of the big card the page opens
 * with, and made of the same three things — the collection's artwork behind
 * it, its records turning over in the emblem, and the pin it pays in the
 * ring of its own progress.
 *
 * What the smaller frame gives up is the words, not the picture: the score
 * is a chip rather than a figure, the crowd a line rather than a row of
 * faces and a sentence. A collection should be recognised here and read on
 * its own page.
 *
 * The row form of the same card — `mc-collection-progress` — says the same
 * numbers in a line of text, for a list that is being scanned rather than
 * looked at.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-tile',
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		CollectionBackdropComponent,
		CollectionEmblemComponent,
		CollectionPinComponent,
	],
	template: `
		@let item = collection();

		<a
			class="tile"
			[class.is-completed]="item.completed"
			[routerLink]="['/collections', item.slug]"
		>
			<mc-collection-backdrop
				[coverImageUrl]="item.coverImageUrl"
				[covers]="item.covers"
			/>

			<!-- A jelvény a sarokban, a borítóktól távol. -->
			<mc-collection-pin
				class="pin"
				[badgeArtworkUrl]="item.badgeArtworkUrl"
				[badgeName]="item.badgeName"
				[icon]="item.icon"
				[percentage]="item.percentage"
				[ring]="signedIn()"
				[completed]="item.completed"
			/>

			<mc-collection-emblem
				class="emblem"
				[covers]="item.covers"
				[coverImageUrl]="item.coverImageUrl"
				[icon]="item.icon"
				[percentage]="item.percentage"
				[share]="signedIn()"
				[mosaicFirst]="true"
			/>

			<span class="body">
				<span class="info">
					<span class="name">
						{{ item.name }}
						@if (item.completed) {
							<b class="done">
								<i class="pi pi-check" aria-hidden="true"></i>
								{{ 'home.collections.done' | transloco }}
							</b>
						}
					</span>

					@if (item.description) {
						<span class="lead">{{ item.description }}</span>
					}

					<span class="tally">
						<!-- Vendégnek nincs polca: a 0 / 20 róla hazudna. -->
						@if (signedIn()) {
							<span
								class="counts"
								role="progressbar"
								[attr.aria-valuenow]="item.percentage"
								aria-valuemin="0"
								aria-valuemax="100"
								[attr.aria-label]="
									'home.weekly.progress' | transloco
								"
							>
								{{ item.owned }} / {{ item.total }}
							</span>
						} @else {
							<span class="counts">
								{{
									item.total | mcPlural: 'home.weekly.albums'
								}}
							</span>
						}

						<span class="points">
							@if (item.completed) {
								{{ item.earnedPoints | mcNumber }}
							} @else {
								+{{ item.points | mcNumber }}
							}
							{{ 'home.weekly.points' | transloco }}
						</span>
					</span>

					<span class="crowd">
						@if (faces().length) {
							<span class="faces" aria-hidden="true">
								@for (face of faces(); track face.uid) {
									@if (face.photoURL) {
										<img
											[src]="face.photoURL"
											alt=""
											loading="lazy"
										/>
									} @else {
										<span class="face">{{
											face.initial
										}}</span>
									}
								}
							</span>
						}

						@if (item.finisherCount) {
							<span class="done-by">{{
								'page.collectors.finishedBy'
									| transloco: { count: item.finisherCount }
							}}</span>
						}
						@if (item.hunterCount) {
							<span>{{
								'page.collectors.collectedBy'
									| transloco: { count: item.hunterCount }
							}}</span>
						}
						@if (!item.finisherCount && !item.hunterCount) {
							<span>{{
								'home.collections.yoursToTake' | transloco
							}}</span>
						}
					</span>
				</span>
			</span>
		</a>
	`,
	styles: `
		:host {
			display: block;
			height: 100%;
		}

		.tile {
			position: relative;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			height: 100%;
			min-height: 14rem;
			overflow: hidden;
			color: #fff;
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);

			/*
			 * A kis kártyán kisebb a kép, ezért lágyabb homály is elég — és
			 * csak a borítófalra: a kurátor képe itt is élesen áll, a
			 * fedését a háttér-komponens a maga alapértelmezésével adja.
			 */
			--mc-backdrop-blur: 14px;

			&:hover,
			&:focus-visible {
				border-color: var(--mc-border-strong);
			}

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 2px;
			}

			&.is-completed {
				border-color: var(--mc-accent);
			}
		}

		/*
		 * A jelvény a sarokban; a pont a számok mellé került alá. A .tile
		 * azért van kiírva a szabály elé, hogy a pin saját relative
		 * hostja ne vihesse el a helyezést.
		 */
		.tile .pin {
			position: absolute;
			z-index: 1;
			top: 0.8rem;
			right: 0.8rem;
			width: 2.9rem;

			--mc-pin-size: 0.9rem;
		}

		.points {
			font-size: 0.78rem;
			font-weight: 700;
			font-variant-numeric: tabular-nums;
			color: var(--mc-accent);
		}

		/*
		 * A jel fent, a szöveg lent, teljes szélességben: a nagy kártya
		 * kicsiben, és a homályos háttérből sem marad üres sáv.
		 */
		.emblem {
			position: relative;
			width: 5.25rem;
			margin: 0.9rem 0 0 1rem;

			--mc-emblem-gap: 0.4rem;
			--mc-emblem-radius: 0.6rem;
			--mc-emblem-pin: 38%;
			--mc-emblem-pin-size: 0.8rem;
			--mc-emblem-share-size: 0.75rem;
			--mc-emblem-art-icon: 1.6rem;
		}

		.body {
			position: relative;
			padding: 0.9rem 1rem 1rem;
		}

		.info {
			display: flex;
			min-width: 0;
			flex-direction: column;
			gap: 0.3rem;
		}

		/* A szám és a pont egy sorban: ugyanaz a mondat két fele. */
		.tally {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.3rem 0.5rem;
		}

		.name {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.4rem;
			font-family: var(--mc-font-display);
			font-size: 1.15rem;
			letter-spacing: 0.02em;
			text-transform: uppercase;
			overflow-wrap: anywhere;
		}

		.done {
			display: inline-flex;
			align-items: center;
			gap: 0.25rem;
			font-family: var(--mc-font-body);
			font-size: 0.68rem;
			font-weight: 700;
			letter-spacing: 0.1em;
			color: var(--mc-accent);
		}

		/* Két sor a leírásból: a kártyákat egy magasságban tartja. */
		.lead {
			display: -webkit-box;
			overflow: hidden;
			font-size: 0.8rem;
			line-height: 1.35;
			color: #cfcfcf;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
		}

		.counts {
			font-size: 0.78rem;
			font-variant-numeric: tabular-nums;
			color: #cfcfcf;
		}

		.crowd {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.3rem 0.5rem;
			font-size: 0.72rem;
			color: #b3b3b3;

			span + span::before {
				margin-right: 0.5rem;
				content: '·';
			}

			.faces + span::before {
				content: none;
			}

			.done-by {
				color: var(--mc-accent);
			}
		}

		.faces {
			display: flex;
			gap: 0.2rem;

			img,
			.face {
				display: grid;
				place-items: center;
				width: 1.3rem;
				height: 1.3rem;
				overflow: hidden;
				font-size: 0.65rem;
				color: var(--mc-primary);
				background: var(--mc-bg-muted);
				border-radius: 50%;
				object-fit: cover;
			}
		}
	`,
})
export class CollectionTileComponent {
	public readonly collection = input.required<CollectionTileView>();
	/**
	 * Whether there is a collector behind this reader. A guest has no shelf
	 * to measure, so the ring, the share and the tally give way to what the
	 * collection is: how many records it asks for.
	 */
	public readonly signedIn = input(true);

	/** Whoever finished it first, then whoever is after it. */
	protected readonly faces = computed(() =>
		[...this.collection().finishers, ...this.collection().hunters].slice(
			0,
			FACES
		)
	);
}
