import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	untracked,
	viewChild,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	YoutubeAlbum,
	YoutubeItem,
	YoutubePlaybackStore,
} from './youtube-playback.store';

/**
 * YouTube on the album page: the place of the app's YouTube player (the
 * dock covers it) and a picker between the album's YouTube Music playlist
 * and its videos. When another album is playing, offers to switch.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-youtube-panel',
	imports: [...I18N_IMPORTS],
	template: `
		@if (isLoaded()) {
			<div #slot class="slot"></div>

			@if (items().length > 1) {
				<ul
					class="picker"
					[attr.aria-label]="
						'ui.youtubePanel.choose-what-to-play' | transloco
					"
				>
					@for (
						item of items();
						track item.kind + item.id;
						let i = $index
					) {
						<li>
							<button
								type="button"
								class="item"
								[attr.aria-pressed]="isSelected(item)"
								(click)="youtube.select(item)"
							>
								@if (item.kind === 'playlist') {
									<span
										class="thumb album"
										aria-hidden="true"
									>
										<i class="pi pi-list"></i>
									</span>
									<span class="label">{{
										'ui.youtubePanel.full-album' | transloco
									}}</span>
								} @else {
									<img
										class="thumb"
										[src]="
											'https://i.ytimg.com/vi/' +
											item.id +
											'/mqdefault.jpg'
										"
										alt=""
										loading="lazy"
									/>
									<span class="label">
										{{
											'ui.youtubePanel.video'
												| transloco
													: { number: videoNumber(i) }
										}}
									</span>
								}
							</button>
						</li>
					}
				</ul>
			}
		} @else if (youtube.album(); as playing) {
			<div class="busy">
				<p>
					{{ 'ui.youtubePanel.playing-now' | transloco }}
					<strong>{{ playing.title }}</strong>
					<span class="muted"> · {{ playing.artistName }}</span>
				</p>
				<button type="button" class="button" (click)="switchHere()">
					<i class="pi pi-play" aria-hidden="true"></i>
					{{ 'ui.youtubePanel.play-this-album-instead' | transloco }}
				</button>
			</div>
		}
	`,
	styles: `
		:host {
			display: grid;
			gap: 0.75rem;
		}

		.slot {
			width: 100%;
			max-width: 40rem;
			aspect-ratio: 16 / 9;
			border-radius: var(--mc-radius-md);
			background: #000;
		}

		.picker {
			display: flex;
			gap: 0.75rem;
			margin: 0;
			padding: 0 0 0.25rem;
			list-style: none;
			overflow-x: auto;
		}

		.item {
			display: grid;
			gap: 0.35rem;
			width: 9rem;
			padding: 0.35rem;
			color: var(--mc-text);
			font: inherit;
			font-size: 0.8rem;
			text-align: left;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			cursor: pointer;

			&[aria-pressed='true'] {
				border-color: #ff0033;
				box-shadow: 0 0 0 1px #ff0033;
			}
		}

		.thumb {
			display: block;
			width: 100%;
			aspect-ratio: 16 / 9;
			object-fit: cover;
			border-radius: 4px;
		}

		.album {
			display: grid;
			place-items: center;
			color: #fff;
			background: #ff0033;
			font-size: 1.25rem;
		}

		.label {
			font-weight: 600;
		}

		.busy {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem 1rem;
			padding: 0.9rem 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);

			p {
				flex: 1 1 16rem;
				margin: 0;
			}
		}

		.muted {
			color: var(--mc-text-muted);
		}

		.button {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.6rem 1.1rem;
			font: inherit;
			font-weight: 600;
			color: #fff;
			background: #cc0029;
			border: 0;
			border-radius: var(--mc-radius-md);
			cursor: pointer;
		}

		.item:focus-visible,
		.button:focus-visible {
			outline: 2px solid #ff0033;
			outline-offset: 2px;
		}
	`,
})
export class YoutubePanelComponent {
	protected readonly youtube = inject(YoutubePlaybackStore);

	/** The album with its YouTube playlist and videos. */
	public readonly album = input.required<YoutubeAlbum>();

	private readonly slot = viewChild<ElementRef<HTMLElement>>('slot');

	protected readonly items = computed(() => this.album().items);

	/** This album is in the player. */
	protected readonly isLoaded = computed(
		() => this.youtube.album()?.uid === this.album().uid
	);

	public constructor() {
		effect(() => {
			const album = this.album();
			untracked(() => this.youtube.open(album));
		});

		effect((onCleanup) => {
			const element = this.slot()?.nativeElement;
			const albumUid = this.album().uid;
			if (element) {
				untracked(() => this.youtube.setSlot(albumUid, element));
				onCleanup(() => this.youtube.clearSlot(element));
			}
		});
	}

	protected switchHere(): void {
		this.youtube.switchTo(this.album());
	}

	protected isSelected(item: YoutubeItem): boolean {
		const selected = this.youtube.selection();
		return selected?.kind === item.kind && selected.id === item.id;
	}

	/** 1-based number of a video, not counting the album playlist. */
	protected videoNumber(index: number): number {
		return this.items()[0]?.kind === 'playlist' ? index : index + 1;
	}
}
