import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { PlayerSource } from '../../data/player';
import { PlayerStore } from './player.store';

/**
 * Round play buttons over an album card: play the album without opening its
 * page, or pause / resume it when it plays already.
 *
 * One button per source the record can actually be started on, in that
 * source's own colour — Spotify green, YouTube red — so the button says
 * before it is pressed what will come out of it, and a record on both offers
 * both. A source this player cannot drive gets no button at all: the settings
 * decide which source a page plays on, but a card is not a page, and a colour
 * that does nothing when pressed is worse than a colour that is not there.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-play-album-button',
	imports: [...I18N_IMPORTS],
	template: `
		@for (source of sources(); track source) {
			<button
				type="button"
				class="play"
				[class.spotify]="source === 'spotify'"
				[class.youtube]="source === 'youtube'"
				[class.on]="isCurrent(source)"
				[attr.aria-label]="
					(isPlaying(source)
						? 'ui.playAlbumButton.pause-on-' + source
						: 'ui.playAlbumButton.play-on-' + source
					) | transloco: { title: title() ?? '' }
				"
				[disabled]="isLoading(source)"
				(click)="toggle($event, source)"
			>
				<i
					class="pi"
					[class.pi-spin]="isLoading(source)"
					[class.pi-spinner]="isLoading(source)"
					[class.pi-pause]="!isLoading(source) && isPlaying(source)"
					[class.pi-play]="!isLoading(source) && !isPlaying(source)"
					aria-hidden="true"
				></i>
			</button>
		}
	`,
	styles: `
		:host {
			display: flex;
			gap: 0.375rem;
		}

		.play {
			display: grid;
			place-items: center;
			width: 44px;
			height: 44px;
			padding: 0;
			border: 0;
			border-radius: 50%;
			font-size: 1rem;
			color: #fff;
			background: var(--mc-primary);
			box-shadow: 0 6px 18px rgb(0 0 0 / 0.45);
			cursor: pointer;
			transition: transform var(--mc-duration-fast) ease;

			&.spotify {
				color: var(--mc-on-spotify);
				background: var(--mc-spotify);
			}

			&.youtube {
				color: var(--mc-on-youtube);
				background: var(--mc-youtube);
			}

			&:hover:not(:disabled) {
				transform: scale(1.08);
			}

			&:focus-visible {
				outline: 2px solid #fff;
				outline-offset: 2px;
			}

			&:disabled {
				cursor: progress;
			}
		}
	`,
})
export class PlayAlbumButtonComponent {
	/** Our album id. */
	public readonly albumId = input.required<string>();
	/** For the button's accessible name. */
	public readonly title = input<string | null>(null);

	private readonly player = inject(PlayerStore);

	/**
	 * The sources this record can be started on from here. Empty for a guest
	 * or a collector who keeps the outside players off — the store answers
	 * for that, so nothing here has to remember it.
	 */
	protected readonly sources = computed<PlayerSource[]>(() => {
		const albumId = this.albumId();
		const playable = this.player.playableSources();

		return [
			...(playable.spotify.has(albumId)
				? (['spotify'] as PlayerSource[])
				: []),
			...(playable.youtube.has(albumId)
				? (['youtube'] as PlayerSource[])
				: []),
		];
	});

	/** This record is in the player, on this source. */
	protected isCurrent(source: PlayerSource): boolean {
		const now = this.player.now();

		return now?.albumId === this.albumId() && now?.source === source;
	}

	protected isPlaying(source: PlayerSource): boolean {
		return this.isCurrent(source) && !!this.player.now()?.playing;
	}

	/**
	 * Waiting for this record to go on. A queue or a station names no source,
	 * and then both buttons wait together: it is the record being fetched,
	 * not one colour of it.
	 */
	protected isLoading(source: PlayerSource): boolean {
		const loadingSource = this.player.loadingSource();

		return (
			this.player.loadingAlbumId() === this.albumId() &&
			(loadingSource === null || loadingSource === source)
		);
	}

	protected toggle(event: MouseEvent, source: PlayerSource): void {
		event.preventDefault();
		event.stopPropagation();
		if (this.isCurrent(source)) {
			void this.player.togglePlay();
		} else {
			void this.player.playAlbum(this.albumId(), source);
		}
	}
}
