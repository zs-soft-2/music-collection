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
	/** The copy the spine belongs to: where the button on the cover leads. */
	href: string;
	/** Horizontal centre of the spine, relative to the shelving unit. */
	x: number;
	/** The edge of the resting spine the card hangs off, within the room. */
	y: number;
	/** Hanging below the spine instead of above it; see `show`. */
	below: boolean;
}

/** A record pulled out, and how much room there is to show it in. */
export interface PeekAt extends Omit<Peek, 'below'> {
	/** The width of the room the card has to stay inside. */
	within: number;
	/** How much screen there is above the spine, and below it. */
	room: { above: number; below: number };
	/** The other edge of the spine, for a card that has to hang under it. */
	under: number;
}

/** How wide the card is drawn; the styles say the same. */
const CARD_WIDTH = 150;

/** About as tall as it comes out: the cover, the two lines and the button. */
const CARD_HEIGHT = 220;

/** What it keeps clear of the edge of the room. */
const MARGIN = 8;

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
		'[class.is-below]': 'peek()?.below',
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
			<!--
				The way in, for a screen with no hover: there the first tap
				pulls the record out and this opens it. Out of the tab order
				on purpose — the spine itself is the link, and it is the one
				a keyboard and a screen reader reach.
			-->
			<a
				class="peek-open"
				tabindex="-1"
				[attr.href]="peek()?.href || null"
				>{{ 'ui.recordShelf.open' | transloco }}</a
			>
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

		/* Under the spine, where there is no screen left above it. */
		:host(.is-below) {
			transform: translate(-50%, 24px);
		}

		:host(.is-open) {
			display: block;
			animation: peek-in var(--mc-duration-fast) ease;
		}

		/* The button is the only part of the card a finger can reach. */
		.peek-open {
			display: none;
			padding: 0 8px 8px;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--mc-primary);
			text-decoration: none;
			pointer-events: auto;
		}

		@media (hover: none) {
			.peek-open {
				display: block;
			}
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

	/**
	 * The cover above the spine, kept inside the room: a record at either
	 * end of a narrow screen would otherwise be shown half off the page.
	 */
	public show({ within, room, under, ...peek }: PeekAt): void {
		/*
		 * The record that is already out. A pointer crossing its own spine
		 * fires over and over, and setting the card again would redraw it
		 * each time.
		 */
		if (this.peek()?.release === peek.release) {
			return;
		}

		/*
		 * Kept inside the room across, and turned under the spine where the
		 * screen above it has run out — a record near the top of a phone
		 * would otherwise be pulled out into thin air above the page.
		 */
		const edge = CARD_WIDTH / 2 + MARGIN;
		const x = Math.max(edge, Math.min(peek.x, within - edge));
		const below = room.above < CARD_HEIGHT && room.below > room.above;

		this.peek.set({
			...peek,
			below,
			x: within > 2 * edge ? x : peek.x,
			y: below ? under : peek.y,
		});
	}

	public hide(): void {
		this.peek.set(null);
	}
}
