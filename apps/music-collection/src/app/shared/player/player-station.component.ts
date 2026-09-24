import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { PlayerStore } from './player.store';

/**
 * The station on air, wherever the player is shown: what is playing the
 * records, what is waiting behind them, and the three things a listener
 * wants from a radio — the next record, a different order, and silence.
 *
 * The waiting records are named rather than counted. A station that only
 * says "3 more" is a station you have to trust; one that says which three
 * is one you can disagree with, which is the whole point of putting a
 * collector's own shelf on the air.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-player-station',
	imports: [...I18N_IMPORTS],
	template: `
		@if (player.stationLabel()) {
			<div
				class="station"
				role="group"
				[attr.aria-label]="'ui.playerStation.station' | transloco"
			>
				<div class="head">
					<i class="pi pi-wifi" aria-hidden="true"></i>
					<span class="text">
						<span class="label">{{ player.stationLabel() }}</span>
						@if (player.queue().length) {
							<button
								type="button"
								class="queue"
								[attr.aria-expanded]="open()"
								(click)="open.set(!open())"
							>
								{{
									player.queue().length
										| mcPlural: 'ui.playerStation.waiting'
								}}
								<i
									class="pi"
									[class.pi-chevron-down]="!open()"
									[class.pi-chevron-up]="open()"
									aria-hidden="true"
								></i>
							</button>
						} @else {
							<span class="queue quiet">
								{{
									'ui.playerStation.last-record-of-the'
										| transloco
								}}
							</span>
						}
					</span>
					<button
						type="button"
						class="icon-button"
						[class.on]="player.shuffled()"
						[attr.aria-pressed]="player.shuffled()"
						[attr.aria-label]="
							'ui.playerStation.play-in-a-random' | transloco
						"
						[title]="
							'ui.playerStation.play-in-a-random2' | transloco
						"
						(click)="player.setShuffled(!player.shuffled())"
					>
						<i class="pi pi-sync" aria-hidden="true"></i>
					</button>
					<button
						type="button"
						class="icon-button"
						[attr.aria-label]="
							'ui.playerStation.next-record' | transloco
						"
						[title]="'ui.playerStation.next-record2' | transloco"
						[disabled]="!player.queue().length"
						(click)="player.playNextAlbum()"
					>
						<i class="pi pi-fast-forward" aria-hidden="true"></i>
					</button>
					<button
						type="button"
						class="icon-button"
						[attr.aria-label]="
							'ui.playerStation.stop-the-station' | transloco
						"
						[title]="
							'ui.playerStation.stop-the-station2' | transloco
						"
						(click)="player.stopStation()"
					>
						<i class="pi pi-times" aria-hidden="true"></i>
					</button>
				</div>

				@if (open() && player.queueRecords().length) {
					<ol class="up-next">
						@for (
							record of player.queueRecords();
							track record.albumId
						) {
							<li>
								<button
									type="button"
									(click)="
										player.playQueuedAlbum(record.albumId)
									"
									[attr.title]="
										'Play ' + record.albumTitle + ' now'
									"
								>
									@if (record.coverUrl) {
										<img
											[src]="record.coverUrl"
											alt=""
											loading="lazy"
										/>
									} @else {
										<span
											class="no-cover"
											aria-hidden="true"
										>
											<i class="pi pi-image"></i>
										</span>
									}
									<span class="names">
										<span class="title">{{
											record.albumTitle
										}}</span>
										@if (record.artistName) {
											<span class="artist">{{
												record.artistName
											}}</span>
										}
									</span>
								</button>
							</li>
						}
					</ol>
				}
			</div>
		}
	`,
	styles: `
		.station {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			padding: 0.5rem 0.75rem;
			border: 1px solid var(--mc-border);
			border-radius: 0.75rem;
			background: var(--mc-surface-2);
		}

		.head {
			display: flex;
			align-items: center;
			gap: 0.6rem;
		}

		.pi-wifi {
			font-size: 1rem;
			color: var(--mc-accent);
			transform: rotate(45deg);
		}

		.text {
			display: flex;
			flex-direction: column;
			min-width: 0;
			line-height: 1.25;
		}

		.label {
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--mc-text);
		}

		.queue {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			padding: 0;
			border: 0;
			font: inherit;
			font-size: 0.72rem;
			color: var(--mc-text-muted);
			background: transparent;
			cursor: pointer;

			&.quiet {
				cursor: default;
			}

			&:hover:not(.quiet) {
				color: var(--mc-text);
			}

			.pi {
				font-size: 0.6rem;
			}
		}

		.icon-button {
			display: inline-grid;
			place-items: center;
			width: 32px;
			height: 32px;
			flex: none;
			padding: 0;
			border: 0;
			border-radius: 50%;
			color: var(--mc-text-muted);
			background: transparent;
			cursor: pointer;

			&:first-of-type {
				margin-left: auto;
			}

			&:hover:not(:disabled) {
				color: var(--mc-text);
				background: var(--mc-card-bg);
			}

			&.on {
				color: var(--mc-accent);
				background: var(--mc-card-bg);
			}

			&:disabled {
				opacity: 0.4;
				cursor: default;
			}
		}

		/* What is coming, in the order it will come. */
		.up-next {
			display: grid;
			gap: 0.15rem;
			max-height: 13rem;
			margin: 0;
			padding: 0;
			overflow-y: auto;
			list-style: none;
			counter-reset: up-next;
		}

		.up-next button {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			width: 100%;
			padding: 0.25rem;
			border: 0;
			border-radius: 0.5rem;
			font: inherit;
			text-align: left;
			color: inherit;
			background: transparent;
			cursor: pointer;

			&:hover {
				background: var(--mc-card-bg);
			}
		}

		img,
		.no-cover {
			width: 32px;
			height: 32px;
			flex: none;
			border-radius: 0.25rem;
			object-fit: cover;
		}

		.no-cover {
			display: grid;
			place-items: center;
			font-size: 0.7rem;
			color: var(--mc-text-muted);
			background: var(--mc-surface-2);
		}

		.names {
			display: flex;
			flex-direction: column;
			min-width: 0;
			line-height: 1.2;
		}

		.title,
		.artist {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.title {
			font-size: 0.78rem;
			color: var(--mc-text);
		}

		.artist {
			font-size: 0.7rem;
			color: var(--mc-text-muted);
		}
	`,
})
export class PlayerStationComponent {
	protected readonly player = inject(PlayerStore);

	/** The waiting records are listed on asking; the strip stays small. */
	protected readonly open = signal(false);
}
