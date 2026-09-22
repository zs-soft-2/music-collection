import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';

import {
	MEASUREMENT_OFFERED,
	MeasurementConsentService,
} from '../../data/analytics';
import { ExternalPlayerConsentService } from '../../data/external-player';

/**
 * The questions the app has to ask before it does something on someone else's
 * behalf, and nothing else. Each one is asked once, carries both answers with
 * neither hidden behind the other, and goes away when answered; the profile's
 * privacy card is where they are taken back.
 *
 * Both questions can be outstanding at the same time — a collector who has
 * just signed in — so the bar stacks them rather than queueing them behind
 * each other.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-consent-bar',
	template: `
		@if (askingMeasurement() || players.asking()) {
			<div class="bar" role="region" aria-label="Your choices">
				@if (askingMeasurement()) {
					<div class="question">
						<p>
							May we count which pages and features get used?
							Google Analytics, no advertising — what you own and
							what you search for stays out of it.
						</p>

						<div class="choice">
							<button
								type="button"
								class="decline"
								(click)="measurement.decide(false)"
							>
								No thanks
							</button>
							<button
								type="button"
								class="allow"
								(click)="measurement.decide(true)"
							>
								Allow
							</button>
						</div>
					</div>
				}

				@if (players.asking()) {
					<div class="question">
						<p>
							May we put YouTube's and Spotify's players on the
							page so you can listen here? They are not ours:
							each one writes its own storage and tells its owner
							you were here. Without this the records stay
							silent.
						</p>

						<div class="choice">
							<button
								type="button"
								class="decline"
								(click)="players.decide(false)"
							>
								Keep them off
							</button>
							<button
								type="button"
								class="allow"
								(click)="players.decide(true)"
							>
								Allow
							</button>
						</div>
					</div>
				}

				<p class="note">
					You can change either of these any time on your profile.
				</p>
			</div>
		}
	`,
	styles: `
		.bar {
			position: fixed;
			/*
			 * Above the floating YouTube dock (z-index 1000): a question that
			 * gates everything else must not end up behind a player someone
			 * left open.
			 */
			z-index: 1100;
			inset-inline: 0;
			bottom: 0;
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			padding: 0.875rem 1.25rem
				calc(0.875rem + env(safe-area-inset-bottom, 0px));
			border-top: 1px solid var(--mc-border);
			background: var(--mc-card-bg);
			backdrop-filter: blur(8px);
			color: var(--mc-text);
			font-family: var(--mc-font-body);
		}

		.question {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem 1.5rem;
			align-items: center;
			justify-content: center;
		}

		p {
			max-width: 60ch;
			margin: 0;
			font-size: 0.875rem;
			color: var(--mc-text-muted);
		}

		.note {
			text-align: center;
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
		}

		.choice {
			display: flex;
			gap: 0.5rem;
		}

		button {
			padding: 0.45rem 1.1rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-sm);
			background: transparent;
			color: var(--mc-text);
			font: inherit;
			font-size: 0.875rem;
			cursor: pointer;
			transition: background var(--mc-duration-fast);
		}

		button:hover {
			background: var(--mc-card-bg-hover);
		}

		.allow {
			border-color: var(--mc-primary);
			background: var(--mc-primary);
			color: var(--mc-on-primary);
		}

		.allow:hover {
			background: var(--mc-primary);
			filter: brightness(1.1);
		}
	`,
})
export class ConsentBarComponent {
	protected readonly measurement = inject(MeasurementConsentService);
	protected readonly players = inject(ExternalPlayerConsentService);

	/** Only while the app measures at all and the answer is still missing. */
	protected readonly askingMeasurement = computed(
		() => MEASUREMENT_OFFERED && this.measurement.consented() === null
	);
}
