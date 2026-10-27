import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { SpotifyIconComponent } from '../spotify/spotify-icon.component';
import { YoutubeIconComponent } from '../youtube/youtube-icon.component';
import { PlayerStore } from './player.store';

/**
 * The one button a page is started from: the album page's, the track page's,
 * the same button in both.
 *
 * It wears the colour and the mark of the source it would play on — Spotify
 * green, YouTube red — so it says before it is pressed what will come out of
 * it, the way the buttons on a card already do. The word beside the mark is
 * what the press does, so the mark never has to carry the state as well.
 *
 * It is not there at all where this player has nothing to press: no leave
 * for the outside players, no source for the record, or Spotify's own frame
 * on the page, which is its own play button.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-page-play-button',
	imports: [...I18N_IMPORTS, SpotifyIconComponent, YoutubeIconComponent],
	template: `
		@if (player.pagePlayButton()) {
			<button
				type="button"
				class="play"
				[class.spotify]="player.pageSource() === 'spotify'"
				[class.youtube]="player.pageSource() === 'youtube'"
				(click)="player.togglePage()"
			>
				@switch (player.pageSource()) {
					@case ('spotify') {
						<mc-spotify-icon />
					}
					@case ('youtube') {
						<mc-youtube-icon />
					}
					@default {
						<i class="pi pi-play" aria-hidden="true"></i>
					}
				}
				<span>{{ player.pagePlaying() ? 'Pause' : 'Play' }}</span>
			</button>
		}
	`,
	styles: `
		:host {
			display: contents;
		}

		.play {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			/* The page says how tall its buttons stand. */
			height: var(--mc-page-play-height, 44px);
			padding: 0 var(--mc-page-play-padding, 1.4rem);
			border: 0;
			border-radius: calc(var(--mc-page-play-height, 44px) / 2);
			font: inherit;
			font-size: var(--mc-page-play-font-size, inherit);
			font-weight: 700;
			color: #fff;
			background: var(--mc-primary);
			cursor: pointer;
			transition: transform var(--mc-duration-fast) ease;

			&.spotify {
				color: var(--mc-on-spotify);
				background: var(--mc-spotify);
			}

			&.youtube {
				color: var(--mc-on-youtube);
				background: var(--mc-youtube);
				/* The mark's own red is the button here, so it is worn
				   inside out: white box, red arrow. */
				--mc-youtube-mark-box: currentColor;
				--mc-youtube-mark-arrow: var(--mc-youtube);
			}

			&:hover {
				transform: scale(1.04);
			}

			&:focus-visible {
				outline: 2px solid var(--mc-text);
				outline-offset: 2px;
			}
		}

		/* On the source's own colour the mark goes in the button's ink,
		   which is what Spotify's brand rules ask for. The mark sets its own
		   colour, so this has to be said from further in than it does. */
		.play mc-spotify-icon,
		.play mc-youtube-icon {
			color: inherit;
		}
	`,
})
export class PagePlayButtonComponent {
	protected readonly player = inject(PlayerStore);
}
