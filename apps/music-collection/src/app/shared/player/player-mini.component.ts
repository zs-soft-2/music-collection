import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	HostListener,
	inject,
	signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { SpotifyIconComponent } from '../spotify/spotify-icon.component';
import { YoutubeIconComponent } from '../youtube/youtube-icon.component';
import { PlayerStore } from './player.store';

/**
 * What plays, in the app bar on every page, whichever source it is on: the
 * controls, and a button that opens the full-screen player.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-player-mini',
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		SpotifyIconComponent,
		YoutubeIconComponent,
	],
	template: `
		@if (player.now(); as now) {
			<div
				class="player"
				role="group"
				[attr.aria-label]="'ui.playerMini.player' | transloco"
			>
				<a
					class="now"
					[routerLink]="now.albumId ? ['/album', now.albumId] : null"
					[attr.aria-label]="
						now.albumId ? 'Open album: ' + now.title : null
					"
				>
					@if (now.coverUrl) {
						<img class="art" [src]="now.coverUrl" alt="" />
					} @else if (now.source === 'spotify') {
						<mc-spotify-icon class="art-icon" />
					} @else {
						<mc-youtube-icon class="art-icon" />
					}
					<span class="text" aria-live="polite">
						<span class="track">{{ now.title }}</span>
						<span class="artists">{{ now.subtitle }}</span>
					</span>
				</a>

				@if (player.canSkip()) {
					<button
						type="button"
						class="control secondary"
						[attr.aria-label]="
							'ui.playerMini.previous-track' | transloco
						"
						(click)="player.skip('previous')"
					>
						<i class="pi pi-step-backward" aria-hidden="true"></i>
					</button>
				}
				<button
					type="button"
					class="control primary"
					[class.youtube]="now.source === 'youtube'"
					[attr.aria-label]="
						player.sideBreak()
							? 'Play ' + player.sideBreak()!.label
							: now.playing
								? 'Pause'
								: 'Play'
					"
					[attr.title]="
						player.sideBreak() ? 'Turn the record over' : null
					"
					(click)="player.togglePlay()"
				>
					<i
						class="pi"
						[class.pi-refresh]="player.sideBreak()"
						[class.pi-play]="!now.playing && !player.sideBreak()"
						[class.pi-pause]="now.playing"
						aria-hidden="true"
					></i>
				</button>
				@if (player.canSkip()) {
					<button
						type="button"
						class="control secondary"
						[attr.aria-label]="
							'ui.playerMini.next-track' | transloco
						"
						(click)="player.skip('next')"
					>
						<i class="pi pi-step-forward" aria-hidden="true"></i>
					</button>
				}
				@if (player.queue().length) {
					<button
						type="button"
						class="control secondary"
						[attr.aria-label]="
							'ui.playerMini.next-record-of-the' | transloco
						"
						[attr.title]="
							player.stationLabel() +
							' · ' +
							player.queue().length +
							' waiting'
						"
						(click)="player.playNextAlbum()"
					>
						<i class="pi pi-fast-forward" aria-hidden="true"></i>
					</button>
				}
				@if (player.volume() !== null) {
					<div class="volume secondary">
						<button
							type="button"
							class="control"
							[attr.aria-label]="
								'ui.playerMini.volume' | transloco
							"
							aria-controls="mini-player-volume"
							[attr.aria-expanded]="volumeOpen()"
							(click)="volumeOpen.set(!volumeOpen())"
						>
							<i
								class="pi"
								[class.pi-volume-off]="player.volume() === 0"
								[class.pi-volume-down]="
									player.volume()! > 0 &&
									player.volume()! < 50
								"
								[class.pi-volume-up]="player.volume()! >= 50"
								aria-hidden="true"
							></i>
						</button>
						@if (volumeOpen()) {
							<div id="mini-player-volume" class="volume-popup">
								<input
									type="range"
									min="0"
									max="100"
									step="1"
									[attr.aria-label]="
										'ui.playerMini.volume2' | transloco
									"
									[value]="player.volume()"
									[disabled]="!player.volumeSupported()"
									(input)="setVolume($event)"
								/>
								<span class="volume-value">
									@if (player.volumeSupported()) {
										{{ player.volume() }}%
									} @else {
										Not adjustable
									}
								</span>
							</div>
						}
					</div>
				}
				<button
					type="button"
					class="control"
					[attr.aria-label]="
						'ui.playerMini.open-the-full-screen' | transloco
					"
					[title]="'ui.playerMini.full-screen' | transloco"
					(click)="player.openStage()"
				>
					<i class="pi pi-window-maximize" aria-hidden="true"></i>
				</button>
			</div>
		}
	`,
	styles: `
		:host {
			display: contents;
		}

		.player {
			display: flex;
			align-items: center;
			gap: 0.25rem;
			height: 44px;
			margin-right: 0.5rem;
			padding: 0 0.25rem;
			border: 1px solid var(--mc-border);
			border-radius: 999px;
			background: var(--mc-card-bg);
		}

		.now {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			min-width: 0;
			padding-right: 0.35rem;
			color: inherit;
			text-decoration: none;
			border-radius: 999px;
		}

		a.now[href]:hover .track {
			text-decoration: underline;
		}

		.art {
			width: 34px;
			height: 34px;
			flex-shrink: 0;
			object-fit: cover;
			border-radius: 50%;
		}

		.art-icon {
			font-size: 1.6rem;
			margin-left: 0.25rem;
		}

		.text {
			display: flex;
			flex-direction: column;
			min-width: 0;
			max-width: 14rem;
			line-height: 1.2;
		}

		.track,
		.artists {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.track {
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--mc-text);
		}

		.artists {
			font-size: 0.72rem;
			color: var(--mc-text-muted);
		}

		.control {
			display: inline-grid;
			place-items: center;
			width: 36px;
			height: 36px;
			flex-shrink: 0;
			padding: 0;
			border: 0;
			border-radius: 50%;
			background: transparent;
			color: var(--mc-text-muted);
			cursor: pointer;

			&:hover {
				color: var(--mc-text);
				background: var(--mc-surface-2);
			}

			&.primary {
				color: var(--mc-on-spotify);
				background: var(--mc-spotify);
			}

			&.primary.youtube {
				color: #fff;
				background: #ff0000;
			}
		}

		.volume {
			position: relative;
		}

		.volume-popup {
			position: absolute;
			top: calc(100% + 0.5rem);
			right: 0;
			z-index: 10;
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.6rem 0.8rem;
			white-space: nowrap;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			box-shadow: 0 6px 20px rgb(0 0 0 / 0.18);

			input {
				width: 9rem;
				accent-color: var(--mc-spotify);
				cursor: pointer;

				&:disabled {
					opacity: 0.5;
					cursor: default;
				}
			}
		}

		.volume-value {
			min-width: 2.5rem;
			font-size: 0.75rem;
			color: var(--mc-text-muted);
			text-align: right;
		}

		.now:focus-visible,
		.control:focus-visible,
		.volume-popup input:focus-visible {
			outline: 2px solid var(--mc-spotify-text);
			outline-offset: 2px;
		}

		/* Narrower screens: cover and play/pause only. */
		@media (max-width: 1100px) {
			.text {
				display: none;
			}
		}

		@media (max-width: 768px) {
			.secondary {
				display: none;
			}

			.player {
				margin-right: 0.25rem;
			}
		}
	`,
})
export class PlayerMiniComponent {
	private readonly host = inject(ElementRef<HTMLElement>);
	protected readonly player = inject(PlayerStore);

	protected readonly volumeOpen = signal(false);

	protected setVolume(event: Event): void {
		this.player.setVolume(Number((event.target as HTMLInputElement).value));
	}

	@HostListener('document:click', ['$event'])
	protected closeVolumeOutside(event: MouseEvent): void {
		if (
			this.volumeOpen() &&
			!this.host.nativeElement.contains(event.target as Node)
		) {
			this.volumeOpen.set(false);
		}
	}

	@HostListener('document:keydown.escape')
	protected closeVolume(): void {
		this.volumeOpen.set(false);
	}
}
