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

/**
 * Asks, once, whether the app may count how it is used, and stays out of the
 * way afterwards. It has to be answered before anything is measured — that is
 * the whole reason the analytics SDK is not loaded until then — so the bar
 * carries both answers, neither of them hidden behind the other.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-measurement-consent',
	template: `
		@if (asking()) {
			<div class="bar" role="region" aria-label="Usage measurement">
				<p>
					May we count which pages and features get used? Google
					Analytics, no advertising — what you own and what you
					search for stays out of it. You can change your mind any
					time on your profile.
				</p>

				<div class="choice">
					<button type="button" class="decline" (click)="decide(false)">
						No thanks
					</button>
					<button type="button" class="allow" (click)="decide(true)">
						Allow
					</button>
				</div>
			</div>
		}
	`,
	styles: `
		.bar {
			position: fixed;
			/*
			 * Above the floating YouTube dock (z-index 1000): the question has
			 * to be answered before anything is measured, so it must not end
			 * up behind a player someone left open.
			 */
			z-index: 1100;
			inset-inline: 0;
			bottom: 0;
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem 1.5rem;
			align-items: center;
			justify-content: center;
			padding: 0.875rem 1.25rem
				calc(0.875rem + env(safe-area-inset-bottom, 0px));
			border-top: 1px solid var(--mc-border);
			background: var(--mc-card-bg);
			backdrop-filter: blur(8px);
			color: var(--mc-text);
			font-family: var(--mc-font-body);
		}

		p {
			max-width: 60ch;
			margin: 0;
			font-size: 0.875rem;
			color: var(--mc-text-muted);
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
export class MeasurementConsentComponent {
	private readonly consent = inject(MeasurementConsentService);

	/** Only while the app measures at all and the answer is still missing. */
	protected readonly asking = computed(
		() => MEASUREMENT_OFFERED && this.consent.consented() === null
	);

	protected decide(consented: boolean): void {
		this.consent.decide(consented);
	}
}
