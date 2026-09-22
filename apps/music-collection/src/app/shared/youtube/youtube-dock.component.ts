import {
	ChangeDetectionStrategy,
	Component,
	DOCUMENT,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	signal,
	untracked,
	viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { ExternalPlayerConsentService } from '../../data/external-player';
import { PlayerStore } from '../player/player.store';
import { YoutubePlaybackStore } from './youtube-playback.store';

interface Box {
	top: number;
	left: number;
	width: number;
	height: number;
}

/**
 * The one YouTube player of the app. Sits over the album page's slot while
 * that page is open, and floats in the corner on other pages so playback
 * goes on. Moving an iframe in the DOM reloads it, so it is never moved:
 * only positioned.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-youtube-dock',
	imports: [RouterLink],
	template: `
		@if (visible()) {
			<div
				class="dock"
				[class.floating]="!docked()"
				[style.top.px]="docked() ? box()?.top : null"
				[style.left.px]="docked() ? box()?.left : null"
				[style.width.px]="docked() ? box()?.width : null"
				[style.height.px]="docked() ? box()?.height : null"
			>
				@if (!docked()) {
					<div class="bar">
						@if (youtube.album(); as album) {
							<a
								class="title"
								[routerLink]="['/album', album.uid]"
								[attr.aria-label]="'Open album: ' + album.title"
							>
								{{ youtube.nowPlayingTitle() ?? album.title }}
							</a>
						}
						<button
							type="button"
							class="close"
							aria-label="Close YouTube player"
							(click)="youtube.close()"
						>
							<i class="pi pi-times" aria-hidden="true"></i>
						</button>
					</div>
				}
				<!-- A new frame per item: the player API binds to one frame. -->
				@for (src of srcs(); track src.key) {
					<div class="frame">
						<iframe
							#frame
							[src]="src.url"
							[title]="
								'YouTube player: ' +
								(youtube.album()?.title ?? '')
							"
							referrerpolicy="strict-origin-when-cross-origin"
							allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
							allowfullscreen
						></iframe>
					</div>
				}
			</div>
		}
	`,
	styles: `
		.dock {
			position: absolute;
			z-index: 20;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			border-radius: var(--mc-radius-md);
			background: #000;
		}

		.dock.floating {
			position: fixed;
			right: 1rem;
			bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
			z-index: 1000;
			width: min(22rem, calc(100vw - 2rem));
			border: 1px solid var(--mc-border);
			box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 45%);
		}

		.bar {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.35rem 0.35rem 0.35rem 0.75rem;
			background: var(--mc-card-bg);
		}

		.title {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			color: var(--mc-text);
			font-size: 0.85rem;
			font-weight: 600;
			text-decoration: none;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.close {
			display: inline-grid;
			place-items: center;
			width: 2rem;
			height: 2rem;
			color: var(--mc-text);
			background: transparent;
			border: 0;
			border-radius: 50%;
			cursor: pointer;
		}

		.title:focus-visible,
		.close:focus-visible {
			outline: 2px solid #ff0033;
			outline-offset: 2px;
		}

		.frame {
			position: relative;
			flex: 1;
			width: 100%;
			aspect-ratio: 16 / 9;
		}

		iframe {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			border: 0;
		}
	`,
})
export class YoutubeDockComponent {
	private readonly sanitizer = inject(DomSanitizer);
	private readonly document = inject(DOCUMENT);
	protected readonly youtube = inject(YoutubePlaybackStore);
	private readonly player = inject(PlayerStore);

	/**
	 * Over the page's slot; floating (above it) while the full-screen player
	 * is open, so the video stays in sight.
	 */
	protected readonly docked = computed(
		() => this.youtube.inSlot() && !this.player.stageOpen()
	);

	private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
	/** Page position of the slot the player covers. */
	protected readonly box = signal<Box | null>(null);

	private readonly consent = inject(ExternalPlayerConsentService);

	/**
	 * In the album page's slot, or floating once something has played — and
	 * never without the collector's leave. The shell already keeps this
	 * component off the page then; the condition is here as well because it is
	 * the frame below that fetches from YouTube, and that must not depend on
	 * who remembered to check.
	 */
	protected readonly visible = computed(
		() =>
			this.consent.allowed() &&
			!!this.youtube.selection() &&
			(this.docked() ? !!this.box() : this.youtube.started())
	);

	/** The player URL of the selected item, as a one-element list. */
	protected readonly srcs = computed<{ key: string; url: SafeResourceUrl }[]>(
		() => {
			const item = this.youtube.selection();
			if (!item) {
				return [];
			}
			const params = new URLSearchParams({
				rel: '0',
				enablejsapi: '1',
				origin: this.document.location.origin,
			});
			if (this.youtube.autoplay()) {
				params.set('autoplay', '1');
			}
			if (item.kind === 'playlist') {
				params.set('list', item.id);
				params.set('index', String(this.youtube.startIndex()));
			}
			const path =
				item.kind === 'playlist'
					? 'videoseries'
					: encodeURIComponent(item.id);
			// The privacy-enhanced host: it holds off YouTube's tracking
			// storage until something is actually played, instead of writing
			// it the moment the frame loads. It does not remove it — the
			// consent above is what answers for that.
			const url = `https://www.youtube-nocookie.com/embed/${path}?${params}`;

			// Only validated ids reach the trusted URL.
			return [
				{
					key: url,
					url: this.sanitizer.bypassSecurityTrustResourceUrl(url),
				},
			];
		}
	);

	public constructor() {
		// Every new frame gets a controlling player.
		effect(() => {
			const frame = this.frame()?.nativeElement;
			if (frame) {
				untracked(() => this.youtube.attach(frame));
			}
		});

		this.followSlot();
	}

	/** Keeps the player over the slot while the page around it changes. */
	private followSlot(): void {
		const view = this.document.defaultView;
		const measure = () => {
			const slot = this.youtube.slot();
			if (!slot || !view) {
				this.box.set(null);
				return;
			}
			const rect = slot.element.getBoundingClientRect();
			this.box.set({
				top: rect.top + view.scrollY,
				left: rect.left + view.scrollX,
				width: rect.width,
				height: rect.height,
			});
		};

		const observer =
			typeof ResizeObserver === 'undefined'
				? null
				: new ResizeObserver(() => measure());
		effect((onCleanup) => {
			const slot = this.youtube.slot();
			untracked(measure);
			if (slot && observer) {
				observer.observe(slot.element);
				// Content above the slot (e.g. a loading tracklist) moves it.
				observer.observe(this.document.body);
				onCleanup(() => observer.disconnect());
			}
		});

		view?.addEventListener('resize', measure);
		inject(DestroyRef).onDestroy(() => {
			view?.removeEventListener('resize', measure);
			observer?.disconnect();
		});
	}
}
