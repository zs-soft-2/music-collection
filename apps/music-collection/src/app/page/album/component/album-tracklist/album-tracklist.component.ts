import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { TrackGroup } from '../../album.mapper';

/** Tracklist grouped by side / disc, with per-track credits. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-tracklist',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		@for (group of groups(); track $index) {
			<div class="group">
				@if (group.label) {
					<h3 class="group-label">
						<span>{{ group.label }}</span>
						@if (group.duration) {
							<span class="group-duration">{{
								group.duration
							}}</span>
						}
					</h3>
				}
				<ol class="tracks">
					@for (track of group.tracks; track track.id) {
						<li
							class="track"
							[class.playing]="track.id === playingId()"
							[attr.aria-current]="
								track.id === playingId() ? 'true' : null
							"
						>
							@if (playable()) {
								<button
									type="button"
									class="position play"
									[attr.aria-label]="'Play ' + track.name"
									(click)="playTrack.emit(track.id)"
								>
									<span class="position-text">{{
										track.position
									}}</span>
									<i
										class="pi"
										[class.pi-play]="
											track.id !== playingId()
										"
										[class.pi-volume-up]="
											track.id === playingId()
										"
										aria-hidden="true"
									></i>
								</button>
							} @else {
								<span class="position">{{
									track.position
								}}</span>
							}
							<span class="body">
								<a
									class="name"
									[routerLink]="['track', track.id]"
									queryParamsHandling="preserve"
									>{{ track.name }}</a
								>
								@if (track.credits.length) {
									<span class="credits">{{
										track.credits.join(' · ')
									}}</span>
								}
							</span>
							<span class="duration">{{ track.duration }}</span>
						</li>
					}
				</ol>
			</div>
		}

		@if (total()) {
			<p class="total">
				<span>{{ 'ui.albumTracklist.total-length' | transloco }}</span>
				<span class="duration">{{ total() }}</span>
			</p>
		}
	`,
	styles: `
		:host {
			display: block;
		}

		.group + .group {
			margin-top: 1.25rem;
		}

		.group-label {
			display: flex;
			justify-content: space-between;
			margin: 0 0 0.4rem;
			padding: 0 0.75rem;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
		}

		.group-duration {
			font-variant-numeric: tabular-nums;
			letter-spacing: normal;
		}

		.tracks {
			margin: 0;
			padding: 0;
			list-style: none;
			border-top: 1px solid var(--mc-border);
		}

		.track {
			display: grid;
			grid-template-columns: 2.75rem minmax(0, 1fr) auto;
			gap: 0.75rem;
			align-items: baseline;
			padding: 0.6rem 0.75rem;
			border-bottom: 1px solid var(--mc-border);
		}

		.track:hover {
			background: rgba(255, 255, 255, 0.03);
		}

		.play {
			display: grid;
			align-items: center;
			justify-items: start;
			padding: 0;
			font: inherit;
			background: none;
			border: 0;
			cursor: pointer;

			> * {
				grid-area: 1 / 1;
			}

			i {
				font-size: 0.8rem;
				color: var(--mc-spotify-text);
				opacity: 0;
			}

			&:focus-visible {
				outline: 2px solid var(--mc-spotify-text);
				outline-offset: 3px;
			}
		}

		.track:hover .play,
		.play:focus-visible,
		.playing .play {
			.position-text {
				opacity: 0;
			}

			i {
				opacity: 1;
			}
		}

		.playing .name {
			color: var(--mc-spotify-text);
		}

		.position {
			font-size: 0.8rem;
			font-weight: 600;
			color: var(--mc-text-subtle);
			font-variant-numeric: tabular-nums;
		}

		.body {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;
			min-width: 0;
		}

		.name {
			font-size: 1rem;
			font-weight: 500;
			color: inherit;
			text-decoration: none;
		}

		a.name:hover,
		a.name:focus-visible {
			text-decoration: underline;
		}

		.credits {
			font-size: 0.78rem;
			line-height: 1.4;
			color: var(--mc-text-muted);
		}

		.duration {
			font-size: 0.85rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		.total {
			display: flex;
			justify-content: space-between;
			margin: 0.75rem 0 0;
			padding: 0 0.75rem;
			font-size: 0.85rem;
			font-weight: 600;
			color: var(--mc-text);
		}
	`,
})
export class AlbumTracklistComponent {
	public readonly groups = input.required<TrackGroup[]>();
	public readonly total = input<string | null>(null);
	/** Shows a play button on each track. */
	public readonly playable = input(false);
	/** Id of the track playing now. */
	public readonly playingId = input<string | null>(null);
	public readonly playTrack = output<string>();
}
