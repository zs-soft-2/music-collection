import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ExternalPlayerConsentService } from '../../data/external-player';
import { PlayerStore } from './player.store';

/**
 * Round play button over an album card: plays the album on the app's player
 * without opening its page, or pauses / resumes it when it plays already.
 * Shows nothing for an album with neither Spotify nor YouTube link.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-play-album-button',
	imports: [...I18N_IMPORTS],
	template: `
		@if (playable()) {
			<button
				type="button"
				class="play"
				[class.on]="isCurrent()"
				[attr.aria-label]="
					(playing() ? 'Pause ' : 'Play ') + (title() ?? 'album')
				"
				[disabled]="loading()"
				(click)="toggle($event)"
			>
				<i
					class="pi"
					[class.pi-spin]="loading()"
					[class.pi-spinner]="loading()"
					[class.pi-pause]="!loading() && playing()"
					[class.pi-play]="!loading() && !playing()"
					aria-hidden="true"
				></i>
			</button>
		}
	`,
	styles: `
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
	private readonly consent = inject(ExternalPlayerConsentService);

	/**
	 * Nothing to offer without a player to play it on: a guest, or a
	 * collector who keeps the outside players off, is not shown a button that
	 * could only disappoint them.
	 */
	protected readonly playable = computed(
		() =>
			this.consent.allowed() &&
			this.player.playableAlbumIds().has(this.albumId())
	);
	protected readonly isCurrent = computed(
		() => this.player.now()?.albumId === this.albumId()
	);
	protected readonly playing = computed(
		() => this.isCurrent() && !!this.player.now()?.playing
	);
	protected readonly loading = computed(
		() => this.player.loadingAlbumId() === this.albumId()
	);

	protected toggle(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		if (this.isCurrent()) {
			void this.player.togglePlay();
		} else {
			void this.player.playAlbum(this.albumId());
		}
	}
}
