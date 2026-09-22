import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProfilePageStore } from '../../profile-page.store';

/**
 * What the collector has actually listened to. Spotify counts plays for the
 * account and YouTube counts them for nobody; this counts them for the
 * records — the ones on the shelf and the ones still only in the catalog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-listening',
	imports: [RouterLink],
	template: `
		@if (store.listening(); as listening) {
			@if (listening.plays) {
				<dl class="totals">
					<div>
						<dt>Records put on</dt>
						<dd>{{ listening.plays }}</dd>
					</div>
					<div>
						<dt>Heard right through</dt>
						<dd>{{ listening.fullPlays }}</dd>
					</div>
					<div>
						<dt>Different records</dt>
						<dd>{{ listening.records }}</dd>
					</div>
					<div>
						<dt>This year</dt>
						<dd>{{ listening.playsThisYear }}</dd>
					</div>
					<div>
						<dt>Hours</dt>
						<dd>{{ listening.hours }}</dd>
					</div>
				</dl>

				@if (listening.top.length) {
					<h3>Put on most</h3>
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
									{{ record.plays }}×
									@if (record.fullPlays) {
										<span class="through"
											>· {{ record.fullPlays }} right
											through</span
										>
									}
								</span>
							</li>
						}
					</ol>
				}
			} @else {
				<p class="empty">
					Nothing yet. Put a record on from an album page and it is
					counted here — a record counts once it has played for half a
					minute, and counts as heard right through once every track
					of it has been.
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
