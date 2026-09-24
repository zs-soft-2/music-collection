import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { NextAlbumView } from '../../collections.model';

/**
 * What to buy next.
 *
 * A collection pays nothing until it is complete, which is what makes one
 * record worth naming above the eight hundred others a collector is missing:
 * the last record of a set hands over the whole of it. Each card therefore
 * leads with what the record is worth — earned tonight where it finishes
 * something, moved closer where it does not — and says which sets are asking
 * for it, so the collector can see why it is here.
 *
 * The whole list is derived from collections already resolved against a
 * catalog already in the cache: nothing on it was fetched.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-next-albums',
	imports: [...I18N_IMPORTS, RouterLink, DecimalPipe],
	template: `
		<ul class="hunt">
			@for (album of albums(); track album.albumUid) {
				<li>
					<a
						class="hunt-card"
						[class.is-decisive]="album.unlockedPoints > 0"
						[routerLink]="['/album', album.albumUid]"
					>
						<span class="hunt-art">
							@if (album.coverUrl) {
								<img
									[src]="album.coverUrl"
									alt=""
									loading="lazy"
								/>
							} @else {
								<span
									class="hunt-placeholder"
									aria-hidden="true"
									>♪</span
								>
							}
						</span>

						<span class="hunt-body">
							<span class="hunt-title">{{
								album.albumName
							}}</span>
							<span class="hunt-artist">
								{{ album.artistName }}
								@if (album.year) {
									<span class="hunt-year"
										>· {{ album.year }}</span
									>
								}
							</span>

							@if (album.unlockedPoints > 0) {
								<span class="hunt-worth is-unlocked">
									<i
										class="pi pi-check-circle"
										aria-hidden="true"
									></i>
									{{
										'ui.nextAlbums.completes'
											| transloco
												: {
														collections:
															album.completes.join(
																', '
															),
												  }
									}}
								</span>
								<span class="hunt-points">
									<strong
										>{{
											album.unlockedPoints | number
										}}
										pts</strong
									>
									{{
										'ui.nextAlbums.the-moment-it-is'
											| transloco
									}}
								</span>
							} @else {
								<span class="hunt-worth">
									@if (album.wantedBy.length > 1) {
										Wanted by
										{{ album.wantedBy.length }} collections
									} @else {
										{{ album.wantedBy[0].name }} —
										{{ album.wantedBy[0].missing }} to go
									}
								</span>
								<span class="hunt-points">
									{{ 'ui.nextAlbums.moves' | transloco }}
									<strong
										>{{
											album.potentialPoints | number
										}}
										pts</strong
									>
									{{ 'ui.nextAlbums.closer' | transloco }}
								</span>
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

		.hunt {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
			gap: 0.75rem;
			padding: 0;
			margin: 0;
			list-style: none;
		}

		.hunt-card {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			gap: 0.85rem;
			align-items: center;
			height: 100%;
			padding: 0.75rem;
			color: inherit;
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);

			&:hover {
				border-color: var(--mc-border-strong);
			}

			/* One record away: the card that earns something tonight. */
			&.is-decisive {
				border-color: var(--mc-accent);
			}
		}

		.hunt-art {
			display: grid;
			place-items: center;
			width: 3.5rem;
			height: 3.5rem;
			overflow: hidden;
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}

		.hunt-placeholder {
			font-size: 1.25rem;
			color: var(--mc-text-subtle);
		}

		.hunt-body {
			display: grid;
			gap: 0.15rem;
			min-width: 0;
		}

		.hunt-title {
			overflow: hidden;
			font-weight: 600;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.hunt-artist {
			overflow: hidden;
			font-size: 0.8rem;
			color: var(--mc-text-muted);
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.hunt-year {
			color: var(--mc-text-subtle);
		}

		.hunt-worth {
			display: flex;
			align-items: center;
			gap: 0.3rem;
			overflow: hidden;
			font-size: 0.78rem;
			color: var(--mc-text-muted);
			text-overflow: ellipsis;
			white-space: nowrap;

			&.is-unlocked {
				font-weight: 600;
				color: var(--mc-accent);
			}
		}

		.hunt-points {
			font-size: 0.78rem;
			color: var(--mc-text-subtle);
			font-variant-numeric: tabular-nums;
		}

		.is-decisive .hunt-points strong {
			color: var(--mc-accent);
		}
	`,
})
export class NextAlbumsComponent {
	/** The records to hunt for, the best buy first; empty hides the section. */
	public readonly albums = input.required<NextAlbumView[]>();
}
