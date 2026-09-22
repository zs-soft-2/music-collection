import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PlayerStore } from './player.store';

/**
 * The record waiting to be turned over. Playback is already wound back to the
 * first track of the new side; this is the hand that puts the needle down.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-player-side-break',
	template: `
		@if (player.sideBreak(); as held) {
			<div class="side-break" role="status">
				<i class="pi pi-refresh" aria-hidden="true"></i>
				<span class="text">
					<span class="lead">Turn the record over</span>
					<span class="side">{{ held.label }} is up next</span>
				</span>
				<button type="button" (click)="player.continueSide()">
					Play {{ held.label }}
				</button>
			</div>
		}
	`,
	styles: `
		.side-break {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.6rem 0.9rem;
			border: 1px solid var(--mc-border);
			border-radius: 0.75rem;
			background: var(--mc-surface-2);
		}

		.pi-refresh {
			font-size: 1.1rem;
			color: var(--mc-text-muted);
		}

		.text {
			display: flex;
			flex-direction: column;
			min-width: 0;
			line-height: 1.25;
		}

		.lead {
			font-size: 0.85rem;
			font-weight: 600;
			color: var(--mc-text);
		}

		.side {
			font-size: 0.75rem;
			color: var(--mc-text-muted);
		}

		button {
			margin-left: auto;
			flex-shrink: 0;
			padding: 0.4rem 0.9rem;
			border: 0;
			border-radius: 999px;
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--mc-on-accent, #fff);
			background: var(--mc-accent);
			cursor: pointer;

			&:hover {
				filter: brightness(1.08);
			}
		}
	`,
})
export class PlayerSideBreakComponent {
	protected readonly player = inject(PlayerStore);
}
