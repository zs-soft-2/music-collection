import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ProfilePageStore } from '../../profile-page.store';

/**
 * What the collector has actually listened to. Spotify counts plays for the
 * account and YouTube counts them for nobody; this counts them for the
 * records — the ones on the shelf and the ones still only in the catalog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-listening',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		@if (store.listening(); as listening) {
			@if (listening.plays) {
				<dl class="totals">
					<div>
						<dt>
							{{
								'ui.profileListening.records-put-on' | transloco
							}}
						</dt>
						<dd>{{ listening.plays }}</dd>
					</div>
					<div>
						<dt>
							{{
								'ui.profileListening.heard-right-through'
									| transloco
							}}
						</dt>
						<dd>{{ listening.fullPlays }}</dd>
					</div>
					<div>
						<dt>
							{{
								'ui.profileListening.different-records'
									| transloco
							}}
						</dt>
						<dd>{{ listening.records }}</dd>
					</div>
					<div>
						<dt>
							{{ 'ui.profileListening.this-year' | transloco }}
						</dt>
						<dd>{{ listening.playsThisYear }}</dd>
					</div>
					<div>
						<dt>{{ 'ui.profileListening.hours' | transloco }}</dt>
						<dd>{{ listening.hours }}</dd>
					</div>
				</dl>

				@if (listening.top.length) {
					<h3>{{ 'ui.profileListening.put-on-most' | transloco }}</h3>
					<ol class="top">
						@for (record of listening.top; track record.albumId) {
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
								<span class="count">
									{{
										'ui.profileListening.plays'
											| transloco: { count: record.plays }
									}}
									@if (record.fullPlays) {
										<span class="through">{{
											'ui.profileListening.through'
												| transloco
													: {
															count: record.fullPlays,
													  }
										}}</span>
									}
								</span>
							</li>
						}
					</ol>
				}
			} @else {
				<p class="empty">
					{{ 'ui.profileListening.nothing-yet-put-a' | transloco }}
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

		h3 {
			margin: 0;
			font-size: 0.8125rem;
			font-weight: 700;
			color: var(--mc-text);
		}

		.top {
			display: grid;
			gap: 0.4rem;
			margin: 0;
			padding: 0;
			list-style: none;
			counter-reset: rank;

			li {
				display: flex;
				align-items: baseline;
				gap: 0.6rem;
				counter-increment: rank;

				&::before {
					content: counter(rank) '.';
					width: 1.2rem;
					flex: none;
					font-size: 0.75rem;
					color: var(--mc-text-muted);
				}
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

			.artist,
			.count,
			.through {
				font-size: 0.75rem;
				color: var(--mc-text-muted);
			}

			.count {
				margin-left: auto;
				flex: none;
				font-variant-numeric: tabular-nums;
			}
		}

		.empty {
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}
	`,
})
export class ProfileListeningComponent {
	protected readonly store = inject(ProfilePageStore);
}
