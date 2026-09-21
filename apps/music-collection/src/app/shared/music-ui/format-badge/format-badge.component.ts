import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';

import { FORMAT_LABELS, MediaFormat } from '@music-collection/ui/music-view';

/** Inline format label with a format-specific icon. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-format-badge',
	host: { class: 'format-badge' },
	template: `
		@switch (format()) {
			@case ('cd') {
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="9.5" />
					<circle cx="12" cy="12" r="3.5" />
				</svg>
			}
			@case ('cassette') {
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<rect
						x="3"
						y="6"
						width="18"
						height="12"
						rx="2"
						stroke="currentColor"
						stroke-width="1"
						fill="none"
					/>
					<circle cx="8" cy="12" r="2" />
					<circle cx="16" cy="12" r="2" />
				</svg>
			}
			@case ('boxset') {
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<rect x="3" y="7" width="18" height="13" rx="1.5" />
					<path d="M3 11h18" />
					<path d="M10 7V4h4v3" />
				</svg>
			}
			@case ('dvd') {
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="9.5" />
					<path
						d="M10 8.5l5 3.5-5 3.5z"
						fill="currentColor"
						stroke="none"
					/>
				</svg>
			}
			@default {
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="1"
						fill="none"
					/>
					<circle
						cx="12"
						cy="12"
						r="6.5"
						stroke="currentColor"
						stroke-width="0.75"
						fill="none"
					/>
					<circle cx="12" cy="12" r="3" />
				</svg>
			}
		}
		<span>{{ label() }}</span>
		@if (weight()) {
			<span class="weight">{{ weight() }}g</span>
		}
	`,
	styles: `
		:host {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		svg {
			width: 14px;
			height: 14px;
			opacity: 0.8;
		}

		.weight {
			color: var(--mc-text-muted);
		}
	`,
})
export class FormatBadgeComponent {
	public readonly format = input.required<MediaFormat>();
	public readonly weight = input<number | null>(null);

	protected readonly label = computed(() => FORMAT_LABELS[this.format()]);
}
