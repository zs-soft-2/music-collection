import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { StarRatingComponent } from '../../../../shared/music-ui';
import { ProfilePageStore } from '../../profile-page.store';

/** One bar of the spread: a star, how many records got it, how wide to draw. */
interface StarBar {
	stars: number;
	count: number;
	/** Share of the most-given star, as a percentage. */
	width: number;
}

/**
 * What the collector thinks of their records: how many they have judged, how
 * generous they are with the stars, and which records they would name first.
 *
 * The spread is the interesting part of it. A collector who gives five stars
 * to half the shelf has said nothing about any of it, and seeing the bars
 * lean is what tells them so — no page needs to.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-verdicts',
	imports: [...I18N_IMPORTS, RouterLink, StarRatingComponent],
	template: `
		@if (store.verdicts(); as verdicts) {
			@if (verdicts.rated) {
				<dl class="totals">
					<div>
						<dt>
							{{ 'ui.profileVerdicts.records-rated' | transloco }}
						</dt>
						<dd>{{ verdicts.rated }}</dd>
					</div>
					<div>
						<dt>
							{{ 'ui.profileVerdicts.your-average' | transloco }}
						</dt>
						<dd>{{ verdicts.average }}</dd>
					</div>
				</dl>

				<ul class="spread">
					@for (bar of spread(); track bar.stars) {
						<li>
							<span class="bar-stars">
								{{ bar.stars }}
								<span aria-hidden="true">★</span>
							</span>
							<span class="bar-track">
								<span
									class="bar-fill"
									[style.width.%]="bar.width"
								></span>
							</span>
							<span class="bar-count">{{ bar.count }}</span>
						</li>
					}
				</ul>

				<h3>
					{{ 'ui.profileVerdicts.what-you-name-first' | transloco }}
				</h3>
				<ol class="top">
					@for (record of verdicts.top; track record.albumId) {
						<li>
							<a [routerLink]="['/album', record.albumId]">
								<span class="title">{{
									record.albumTitle
								}}</span>
								@if (record.artistName) {
									<span class="artist">{{
										record.artistName
									}}</span>
								}
							</a>
							<mc-star-rating
								class="given"
								[stars]="record.stars"
								[readonly]="true"
								[label]="
									record.stars
										| mcPlural: 'ui.starRating.starCount'
								"
							/>
							@if (record.note) {
								<p class="note">{{ record.note }}</p>
							}
						</li>
					}
				</ol>
			} @else {
				<p class="empty">
					{{ 'ui.profileVerdicts.nothing-rated-yet' | transloco }}
				</p>
			}
		}
	`,
	styles: `
		:host {
			display: grid;
			gap: 1rem;
		}

		.totals {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
			gap: 0.75rem;
			margin: 0;

			div {
				display: flex;
				flex-direction: column;
				gap: 0.15rem;
			}

			dt {
				font-size: 0.72rem;
				letter-spacing: 0.08em;
				text-transform: uppercase;
				color: var(--mc-text-muted);
			}

			dd {
				margin: 0;
				font-size: 1.35rem;
				font-weight: 700;
				font-variant-numeric: tabular-nums;
				color: var(--mc-text);
			}
		}

		.spread {
			display: grid;
			gap: 0.25rem;
			margin: 0;
			padding: 0;
			list-style: none;

			li {
				display: flex;
				align-items: center;
				gap: 0.5rem;
			}
		}

		.bar-stars {
			flex: none;
			width: 2.5rem;
			font-size: 0.75rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		.bar-track {
			flex: 1;
			height: 0.5rem;
			background: var(--mc-surface-2, var(--mc-card-bg));
			border-radius: 999px;
			overflow: hidden;
		}

		.bar-fill {
			display: block;
			height: 100%;
			background: var(--mc-accent);
		}

		.bar-count {
			flex: none;
			width: 2rem;
			font-size: 0.75rem;
			text-align: right;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		h3 {
			margin: 0;
			font-size: 0.8125rem;
			font-weight: 700;
			color: var(--mc-text);
		}

		.top {
			display: grid;
			gap: 0.6rem;
			margin: 0;
			padding: 0;
			list-style: none;

			li {
				display: grid;
				grid-template-columns: 1fr auto;
				gap: 0.25rem 0.6rem;
				align-items: baseline;
			}

			a {
				display: flex;
				flex-wrap: wrap;
				align-items: baseline;
				gap: 0.4rem;
				min-width: 0;
				color: inherit;
				text-decoration: none;

				&:hover .title {
					text-decoration: underline;
				}
			}

			.title {
				font-size: 0.875rem;
				font-weight: 600;
				color: var(--mc-text);
			}

			.artist {
				font-size: 0.75rem;
				color: var(--mc-text-muted);
			}

			.given {
				justify-self: end;
			}

			.note {
				grid-column: 1 / -1;
				margin: 0;
				font-size: 0.8125rem;
				font-style: italic;
				color: var(--mc-text-muted);
			}
		}

		.empty {
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}
	`,
})
export class ProfileVerdictsComponent {
	protected readonly store = inject(ProfilePageStore);

	/**
	 * The spread, five stars first. Each bar is drawn against the most-given
	 * star rather than against the whole shelf: what is being read here is
	 * the shape of the collector's judgement, and against a shelf of two
	 * thousand records every bar would be a sliver.
	 */
	protected readonly spread = computed((): StarBar[] => {
		const histogram = this.store.verdicts().histogram;
		const most = Math.max(...histogram, 1);

		return histogram
			.map((count, index) => ({
				stars: index + 1,
				count,
				width: Math.round((count / most) * 100),
			}))
			.reverse();
	});
}
