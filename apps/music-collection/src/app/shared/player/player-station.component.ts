import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PlayerStore } from './player.store';

/**
 * The station on air, wherever the player is shown: what is playing the
 * records, how many are still waiting, and the two things a listener wants
 * from a radio — the next record, and silence.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-player-station',
	template: `
		@if (player.stationLabel()) {
			<div class="station" role="group" aria-label="Station">
				<i class="pi pi-wifi" aria-hidden="true"></i>
				<span class="text">
					<span class="label">{{ player.stationLabel() }}</span>
					<span class="queue">
						@if (player.queue().length) {
							{{ player.queue().length }} more
							{{
								player.queue().length === 1
									? 'record'
									: 'records'
							}}
							waiting
						} @else {
							Last record of the station
						}
					</span>
				</span>
				<button
					type="button"
					class="icon-button"
					aria-label="Next record"
					title="Next record"
					[disabled]="!player.queue().length"
					(click)="player.playNextAlbum()"
				>
					<i class="pi pi-fast-forward" aria-hidden="true"></i>
				</button>
				<button
					type="button"
					class="icon-button"
					aria-label="Stop the station"
					title="Stop the station"
					(click)="player.stopStation()"
				>
					<i class="pi pi-times" aria-hidden="true"></i>
				</button>
			</div>
		}
	`,
	styles: `
		.station {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.5rem 0.75rem;
			border: 1px solid var(--mc-border);
			border-radius: 0.75rem;
			background: var(--mc-surface-2);
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
			font-size: 0.72rem;
			color: var(--mc-text-muted);
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

			&:disabled {
				opacity: 0.4;
				cursor: default;
			}
		}
	`,
})
export class PlayerStationComponent {
	protected readonly player = inject(PlayerStore);
}
