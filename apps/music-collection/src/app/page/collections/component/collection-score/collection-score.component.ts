import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { MINIMUM_ALBUM_POINTS } from '@music-collection/domain/music-collection/engine';

import { CollectionScoreView } from '../../collections.model';

/** How many albums the working lists before it asks to be opened further. */
const ALBUMS_SHOWN = 12;

/**
 * How the score comes about.
 *
 * A number a collector cannot work out again is a number they will not
 * trust, so every line of the sum stands here: the albums added up, what the
 * size of the collection multiplies them by, what a set of a piece adds, and
 * under them each album with the copy that counts for it.
 *
 * It also says the one thing the number cannot: which few records, bought on
 * the medium most of the set is already on, would make it a set of a piece.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-score',
	imports: [...I18N_IMPORTS],
	template: `
		@let item = score();

		<section aria-labelledby="score-title">
			<h2 class="panel-title" id="score-title">
				{{ 'ui.collectionScore.title' | transloco }}
			</h2>

			@if (!signedIn()) {
				<p class="lead">
					{{ 'ui.collectionScore.signIn' | transloco }}
				</p>
			}

			<dl class="sum">
				@if (item.started) {
					<div>
						<dt>
							{{ 'ui.collectionScore.albumPoints' | transloco }}
						</dt>
						<dd>{{ item.albumPoints | mcNumber: '1.0-2' }}</dd>
					</div>
				} @else {
					<div>
						<dt>
							{{
								'ui.collectionScore.modestShelf'
									| transloco: { count: item.total }
							}}
						</dt>
						<dd>
							{{ item.total * minimumAlbumPoints | mcNumber }}
						</dd>
					</div>
				}
				<div>
					<dt>
						{{
							'ui.collectionScore.sizeFactor'
								| transloco: { count: item.total }
						}}
					</dt>
					<dd>×{{ item.sizeFactor | mcNumber: '1.2-2' }}</dd>
				</div>
				@if (item.started) {
					<div>
						<dt>
							{{ 'ui.collectionScore.formatFactor' | transloco }}
							<span class="how">
								@if (item.uniformMedia) {
									{{
										'ui.collectionScore.uniform.' +
											item.uniformMedia | transloco
									}}
								} @else if (item.completed) {
									{{ 'ui.collectionScore.mixed' | transloco }}
								} @else {
									{{
										'ui.collectionScore.unfinished'
											| transloco
									}}
								}
							</span>
						</dt>
						<dd>×{{ item.formatFactor | mcNumber: '1.2-2' }}</dd>
					</div>
				}
				<div class="total">
					<dt>
						@if (item.completed) {
							{{ 'ui.collectionScore.total' | transloco }}
						} @else if (item.started) {
							{{ 'ui.collectionScore.atLeast' | transloco }}
						} @else {
							{{ 'ui.collectionScore.baseValue' | transloco }}
						}
					</dt>
					<dd>
						{{
							item.points | mcPlural: 'ui.collectionScore.points'
						}}
					</dd>
				</div>
			</dl>

			@if (item.tip; as tip) {
				<div class="tip">
					<strong>
						{{
							'ui.collectionScore.tip.title'
								| transloco
									: {
											media:
												('ui.collectionScore.uniform.' +
													tip.media | transloco),
											points:
												(tip.minimumPoints | mcNumber),
											gain: (tip.gain | mcNumber),
									  }
						}}
					</strong>
					<span>
						{{
							tip.albumNames.length
								| mcPlural: 'ui.collectionScore.tip.missing'
						}}
						{{ tip.albumNames.join(', ') }}
					</span>
				</div>
			} @else if (item.completed && item.uniformMedia) {
				<div class="tip is-done">
					<strong>
						{{
							'ui.collectionScore.uniform.' + item.uniformMedia
								| transloco
						}}
						×{{ item.formatFactor | mcNumber: '1.0-2' }}
					</strong>
					<span>{{
						'ui.collectionScore.uniformDone' | transloco
					}}</span>
				</div>
			}

			@if (item.started) {
				<details class="albums">
					<summary>
						{{ 'ui.collectionScore.perAlbum' | transloco }}
					</summary>
					<ul>
						@for (album of albums(); track album.albumUid) {
							<li [class.is-missing]="!album.media">
								<span class="album-name">{{
									album.albumName
								}}</span>
								<span class="album-points">{{
									album.points | mcNumber: '1.0-2'
								}}</span>
								<span class="album-copy">
									@if (album.media && album.rarity) {
										{{
											'ui.collectionScore.media.' +
												album.media | transloco
										}}
										·
										<span
											class="tier"
											[attr.data-tier]="album.rarity"
											>{{
												'ui.collectionScore.rarity.' +
													album.rarity | transloco
											}}</span
										>
										@if (album.copies > 1) {
											·
											{{
												album.copies
													| mcPlural
														: 'ui.collectionScore.copies'
											}}
										}
									} @else {
										{{
											'ui.collectionScore.missing'
												| transloco
										}}
									}
								</span>
							</li>
						}
					</ul>
					@if (hidden() > 0) {
						<button type="button" (click)="expanded.set(true)">
							{{ hidden() | mcPlural: 'ui.collectionScore.more' }}
						</button>
					}
				</details>
			}

			<p class="note">{{ 'ui.collectionScore.note' | transloco }}</p>
		</section>
	`,
	styles: `
		:host {
			display: block;
		}

		.panel-title {
			margin: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.lead,
		.note {
			margin: 0.6rem 0 0;
			font-size: 0.78rem;
			line-height: 1.4;
			color: var(--mc-text-subtle);
		}

		.sum {
			margin: 0.7rem 0 0;
			font-size: 0.85rem;
			font-variant-numeric: tabular-nums;

			div {
				display: flex;
				justify-content: space-between;
				gap: 1rem;
				padding: 0.4rem 0;
				border-bottom: 1px solid var(--mc-border);
			}

			dt {
				color: var(--mc-text-muted);
			}

			dd {
				margin: 0;
				font-weight: 600;
				white-space: nowrap;
			}

			.how {
				display: block;
				font-size: 0.75rem;
				color: var(--mc-text-subtle);
			}

			.total {
				align-items: baseline;
				border-bottom: 0;

				dt {
					font-weight: 700;
					color: var(--mc-text);
				}

				dd {
					font-family: var(--mc-font-display);
					font-size: 1.5rem;
					font-weight: 400;
					line-height: 1;
					color: var(--mc-accent);
				}
			}
		}

		.tip {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
			margin-top: 0.6rem;
			padding: 0.7rem 0.8rem;
			font-size: 0.8rem;
			line-height: 1.4;
			color: var(--mc-text-muted);
			border: 1px dashed var(--mc-accent);
			border-radius: var(--mc-radius-md);

			strong {
				color: var(--mc-accent);
			}

			&.is-done {
				border-style: solid;
			}
		}

		.albums {
			margin-top: 0.8rem;
			font-size: 0.8rem;

			summary {
				font-weight: 600;
				cursor: pointer;
			}

			ul {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				margin: 0.6rem 0 0;
				padding: 0;
				list-style: none;
			}

			li {
				display: grid;
				grid-template-columns: minmax(0, 1fr) auto;
				gap: 0 0.6rem;
			}

			button {
				margin-top: 0.6rem;
				padding: 0;
				font: inherit;
				font-weight: 600;
				color: var(--mc-info);
				background: none;
				border: 0;
				cursor: pointer;
			}
		}

		.album-name {
			font-weight: 600;
			overflow-wrap: anywhere;
		}

		.album-points {
			color: var(--mc-accent);
			font-variant-numeric: tabular-nums;
		}

		.album-copy {
			grid-column: 1 / -1;
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
		}

		.is-missing .album-points {
			color: var(--mc-text-subtle);
		}

		.tier {
			font-weight: 600;

			&[data-tier='uncommon'] {
				color: var(--mc-status-ok);
			}

			&[data-tier='rare'] {
				color: var(--mc-info);
			}

			&[data-tier='veryRare'] {
				color: var(--mc-accent);
			}

			&[data-tier='ultraRare'] {
				color: var(--mc-primary);
			}
		}
	`,
})
export class CollectionScoreComponent {
	public readonly score = input.required<CollectionScoreView>();
	/**
	 * Whether there is a shelf behind this reader. A guest is shown what the
	 * collection is worth to anybody, and told the rest needs a shelf.
	 */
	public readonly signedIn = input(true);

	protected readonly minimumAlbumPoints = MINIMUM_ALBUM_POINTS;
	protected readonly expanded = signal(false);

	/** The albums listed: the head of a long collection until it is opened. */
	protected readonly albums = computed(() =>
		this.expanded()
			? this.score().albums
			: this.score().albums.slice(0, ALBUMS_SHOWN)
	);

	protected readonly hidden = computed(
		() => this.score().albums.length - this.albums().length
	);
}
