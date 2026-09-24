import {
	ChangeDetectionStrategy,
	Component,
	computed,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ReleaseView } from '../../../../shared/music-ui';

interface Peek {
	release: ReleaseView;
	/** Horizontal centre of the spine, relative to the shelving unit. */
	x: number;
	/** Top edge of the resting spine, relative to the shelving unit. */
	y: number;
}

/**
 * The cover pulled out above the active shelf spine. A separate component so a
 * hover only refreshes this small view, never the hundreds of spines.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-record-shelf-peek',
	host: {
		'aria-hidden': 'true',
		'[class.is-open]': 'peek() !== null',
		'[style.left.px]': 'peek()?.x',
		'[style.top.px]': 'peek()?.y',
	},
	imports: [...I18N_IMPORTS],
	template: `
		@if (release(); as release) {
			@if (release.coverUrl) {
				<img [src]="release.coverUrl" alt="" />
			}
			<span class="peek-meta">
				<span class="peek-artist">{{ release.artistName }}</span>
				<span class="peek-title">{{ release.title }}</span>
			</span>
		}
	`,
	styles: `
		:host {
			position: absolute;
			/* Above the sticky collection toolbar (z-index: 30). */
			z-index: 40;
			display: none;
			width: 150px;
			overflow: hidden;
			background: var(--mc-card-bg);
			border-radius: var(--mc-radius-md);
			box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
			/* Above the spine, clear of its 16px hover lift. */
			transform: translate(-50%, calc(-100% - 24px));
			pointer-events: none;
		}

		:host(.is-open) {
			display: block;
			animation: peek-in var(--mc-duration-fast) ease;
		}

		img {
			display: block;
			width: 150px;
			height: 150px;
			object-fit: cover;
		}

		.peek-meta {
			display: flex;
			flex-direction: column;
			gap: 1px;
			padding: 6px 8px 8px;
		}

		.peek-artist {
			font-size: 0.7rem;
			color: var(--mc-text-muted);
		}

		.peek-title {
			font-size: 0.8rem;
			font-weight: 600;
			line-height: 1.2;
			color: var(--mc-text);
		}

		@keyframes peek-in {
			from {
				opacity: 0;
				translate: 0 6px;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			:host(.is-open) {
				animation: none;
			}
		}
	`,
})
export class RecordShelfPeekComponent {
	protected readonly peek = signal<Peek | null>(null);
	protected readonly release = computed(() => this.peek()?.release);

	public show(release: ReleaseView, x: number, y: number): void {
		if (this.peek()?.release !== release) {
			this.peek.set({ release, x, y });
		}
	}

	public hide(): void {
		this.peek.set(null);
	}
}
