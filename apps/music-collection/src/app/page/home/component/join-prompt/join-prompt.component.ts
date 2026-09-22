import { DecimalPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';

/**
 * What a guest gains by signing in, said once, where they have just seen the
 * catalog: the reading is free, the collecting is what an account is for.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-join-prompt',
	imports: [DecimalPipe],
	template: `
		<section class="prompt" aria-labelledby="join-title">
			<div class="copy">
				<h2 id="join-title">Make it your collection</h2>
				<p>
					The catalog is open to everyone —
					{{ albums() | number }} albums of
					{{ artists() | number }} artists to read through. Sign in to
					keep the copies you own, see what a collection is still
					missing and have your shelf follow you between devices.
				</p>
			</div>

			<button type="button" class="button" (click)="join.emit()">
				<i class="pi pi-google" aria-hidden="true"></i>
				Continue with Google
			</button>
		</section>
	`,
	styles: `
		:host {
			display: block;
			margin-top: 3rem;
		}

		.prompt {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: 1.25rem 2rem;
			padding: clamp(1.25rem, 3vw, 2rem);
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-lg);
		}

		.copy {
			flex: 1 1 22rem;
		}

		h2 {
			margin: 0 0 0.5rem;
			font-family: var(--mc-font-display);
			font-size: clamp(1.6rem, 2.5vw, 2.1rem);
			font-weight: 400;
			line-height: 1.1;
			letter-spacing: 0.02em;
		}

		p {
			margin: 0;
			max-width: 46rem;
			font-size: 0.95rem;
			line-height: 1.5;
			color: var(--mc-text-muted);
		}

		.button {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.7rem 1.25rem;
			font: inherit;
			font-weight: 600;
			color: var(--mc-on-primary);
			background: var(--mc-primary);
			border: 0;
			border-radius: var(--mc-radius-md);
			cursor: pointer;
			transition: filter var(--mc-duration-fast) ease;

			&:hover {
				filter: brightness(1.08);
			}

			&:focus-visible {
				outline: 2px solid var(--mc-text);
				outline-offset: 3px;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.button {
				transition: none;
			}
		}
	`,
})
export class JoinPromptComponent {
	/** Catalog-wide counts, so the promise names what there is to read. */
	public readonly albums = input(0);
	public readonly artists = input(0);

	public readonly join = output<void>();
}
