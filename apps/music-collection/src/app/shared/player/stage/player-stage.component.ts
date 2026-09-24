import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	DOCUMENT,
	DestroyRef,
	ElementRef,
	Injector,
	afterNextRender,
	computed,
	effect,
	inject,
	signal,
	untracked,
	viewChild,
	viewChildren,
} from '@angular/core';

import {
	SongVisualProfile,
	VisualInputMode,
	VisualQuality,
	resolveVisualProfile,
} from '@music-collection/ui/visual-engine';

import { SpotifyIconComponent } from '../../spotify/spotify-icon.component';
import { VisualSceneComponent } from '../../visual-scene';
import { YoutubeIconComponent } from '../../youtube/youtube-icon.component';
import { PlayerSettingsMenuComponent } from '../player-settings-menu.component';
import { PlayerSideBreakComponent } from '../player-side-break.component';
import { PlayerStationComponent } from '../player-station.component';
import { PlayerStore } from '../player.store';
import { EmberField } from './embers';
import { EqualizerBars } from './equalizer';
import { activeLineIndex, formatTime, parseLrc } from './lrc';

/** How often the playback position is re-read. */
const CLOCK_MS = 50;
/** Autoscroll waits this long after the user scrolled the lyrics. */
const MANUAL_SCROLL_PAUSE_MS = 4000;
/** Lyric timing nudge per click. */
const OFFSET_STEP_MS = 250;
/** Embers per effects setting. */
const EMBER_COUNT = { off: 0, subtle: 40, full: 90 };
/** Equalizer bars per effects setting. */
const BAR_COUNT = { off: 0, subtle: 32, full: 64 };

/**
 * The player's full-screen view: what plays over the blurred cover, with the
 * synced lyrics following along, rising embers and a flash on every new line.
 * Without synced lyrics the plain text scrolls with the track.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-player-stage',
	templateUrl: './player-stage.component.html',
	styleUrls: ['./player-stage.component.scss'],
	imports: [
		...I18N_IMPORTS,
		SpotifyIconComponent,
		YoutubeIconComponent,
		PlayerSettingsMenuComponent,
		PlayerSideBreakComponent,
		PlayerStationComponent,
		VisualSceneComponent,
	],
	host: {
		role: 'dialog',
		'aria-modal': 'true',
		'[attr.aria-label]': '"Player: " + title()',
		'[attr.data-effects]': 'effects()',
		'(document:keydown)': 'onKey($event)',
	},
})
export class PlayerStageComponent {
	protected readonly player = inject(PlayerStore);
	private readonly document = inject(DOCUMENT);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);

	private readonly canvas =
		viewChild<ElementRef<HTMLCanvasElement>>('embers');
	private readonly flash = viewChild<ElementRef<HTMLElement>>('flash');
	private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
	private readonly lineElements =
		viewChildren<ElementRef<HTMLElement>>('line');

	private readonly now = signal(Date.now());
	private manualScrollAt = 0;
	private embers: EmberField | null = null;
	private equalizer: EqualizerBars | null = null;
	private readonly equalizerCanvas =
		viewChild<ElementRef<HTMLCanvasElement>>('equalizer');

	private readonly reducedMotion =
		this.document.defaultView?.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches ?? false;

	protected readonly effects = computed(() =>
		this.reducedMotion ? 'off' : this.player.settings().effects
	);

	/**
	 * The animated world, when the user asked for it. It replaces the blurred
	 * cover rather than sitting behind it: two backgrounds competing for the
	 * same pixels would only muddy both.
	 */
	protected readonly sceneOn = computed(
		() =>
			this.effects() !== 'off' &&
			this.player.settings().backdrop === 'scene'
	);

	protected readonly visualProfile = computed<SongVisualProfile>(() => {
		const request = this.request();
		return resolveVisualProfile({
			artist: request?.artistName ?? this.player.now()?.subtitle ?? null,
			album: request?.albumTitle ?? null,
			song: this.player.now()?.title ?? request?.trackName ?? null,
			// What the record is, rather than what it is called: this is what
			// decides whether the backdrop is a furnace city or a frozen wood.
			genre: request?.styles ?? null,
		});
	});

	/**
	 * Real sound wins, because nothing else follows the music as closely. A
	 * song we have a timeline for comes next, and everything else simply
	 * breathes on its own.
	 */
	protected readonly visualMode = computed<VisualInputMode>(() => {
		if (this.player.analyser()) {
			return 'audio-reactive';
		}
		return this.visualProfile().timeline ? 'timeline' : 'ambient';
	});

	protected readonly visualQuality = computed<VisualQuality>(() =>
		this.effects() === 'full' ? 'high' : 'medium'
	);

	protected readonly positionSeconds = computed(
		() => this.positionMs() / 1000
	);

	/** Nudges the lyrics earlier (+) or later (−). */
	protected readonly offsetMs = signal(0);

	private readonly request = computed(() => this.player.shown().request);

	protected readonly title = computed(() => {
		const request = this.request();
		return (
			this.player.now()?.title ??
			request?.trackName ??
			request?.albumTitle ??
			''
		);
	});

	protected readonly subtitle = computed(() => {
		const request = this.request();
		const artist = request?.artistName ?? this.player.now()?.subtitle ?? '';
		const album =
			request && this.title() !== request.albumTitle
				? request.albumTitle
				: null;
		return album ? `${artist} · ${album}` : artist;
	});

	protected readonly coverUrl = computed(
		() => this.request()?.coverUrl ?? this.player.now()?.coverUrl ?? null
	);

	protected readonly lyrics = computed(() =>
		this.player.settings().lyrics ? this.player.lyrics() : null
	);
	protected readonly lines = computed(() => parseLrc(this.lyrics()?.synced));
	protected readonly synced = computed(() => this.lines().length > 0);
	protected readonly plainLines = computed(
		() => this.lyrics()?.text.split(/\r?\n/) ?? []
	);

	protected readonly positionMs = computed(() =>
		this.player.positionMs(this.now())
	);
	protected readonly progress = computed(() => {
		const duration = this.player.durationMs();
		return duration ? this.positionMs() / duration : 0;
	});
	protected readonly activeIndex = computed(() =>
		this.player.now()
			? activeLineIndex(this.lines(), this.positionMs() + this.offsetMs())
			: -1
	);

	protected readonly formatTime = formatTime;
	protected readonly audioCaptureSupported =
		this.player.audioCaptureSupported();

	public constructor() {
		const body = this.document.body;
		const overflow = body.style.overflow;
		body.style.overflow = 'hidden';

		const clock = setInterval(() => this.now.set(Date.now()), CLOCK_MS);
		this.destroyRef.onDestroy(() => {
			clearInterval(clock);
			body.style.overflow = overflow;
			this.embers?.stop();
			this.equalizer?.stop();
		});

		// Embers follow the effects setting.
		afterNextRender(() => {
			effect(
				() => {
					const count = EMBER_COUNT[this.effects()];
					const canvas = this.canvas()?.nativeElement;
					untracked(() => {
						this.embers?.stop();
						this.embers = null;
						if (canvas && count) {
							this.embers = new EmberField(canvas, count);
							this.embers.setRunning(this.player.playing());
							this.embers.start();
						}
					});
				},
				{ injector: this.injector }
			);
			effect(
				() => {
					const count = BAR_COUNT[this.effects()];
					const canvas = this.equalizerCanvas()?.nativeElement;
					untracked(() => {
						this.equalizer?.stop();
						this.equalizer = null;
						if (canvas && count) {
							this.equalizer = new EqualizerBars(canvas, count);
							this.equalizer.setAnalyser(this.player.analyser());
							this.equalizer.onBeat = (strength) =>
								this.onBeat(strength);
							this.equalizer.setRunning(this.player.playing());
							this.equalizer.start();
						}
					});
				},
				{ injector: this.injector }
			);
			const resize = () => {
				this.embers?.resize();
				this.equalizer?.resize();
			};
			window.addEventListener('resize', resize);
			this.destroyRef.onDestroy(() =>
				window.removeEventListener('resize', resize)
			);
		});

		// The real sound, once shared.
		effect(() => {
			const analyser = this.player.analyser();
			untracked(() => this.equalizer?.setAnalyser(analyser));
		});

		effect(() => {
			const playing = this.player.playing();
			untracked(() => {
				this.embers?.setRunning(playing);
				this.equalizer?.setRunning(playing);
			});
		});

		// New line: flash, stir the embers, bring the line to the middle.
		effect(() => {
			const index = this.activeIndex();
			untracked(() => {
				if (index < 0) {
					return;
				}
				const effects = this.effects();
				if (effects !== 'off') {
					this.embers?.boost(effects === 'full' ? 0.8 : 0.4);
					this.equalizer?.kick(effects === 'full' ? 1 : 0.6);
					this.flash()?.nativeElement.animate(
						[
							{ opacity: effects === 'full' ? 0.22 : 0.1 },
							{ opacity: 0 },
						],
						{ duration: 700, easing: 'ease-out' }
					);
				}
				this.centerLine(this.lineElements()[index]?.nativeElement);
			});
		});

		// Plain lyrics: scroll along with the track.
		effect(() => {
			const progress = this.progress();
			if (this.synced() || !this.player.now()) {
				return;
			}
			const scroller = this.scroller()?.nativeElement;
			if (
				scroller &&
				Date.now() - this.manualScrollAt > MANUAL_SCROLL_PAUSE_MS
			) {
				scroller.scrollTop =
					(scroller.scrollHeight - scroller.clientHeight) * progress;
			}
		});
	}

	protected close(): void {
		this.player.closeStage();
	}

	protected onKey(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			this.close();
		} else if (event.key === ' ' && event.target === this.document.body) {
			event.preventDefault();
			void this.player.togglePlay();
		}
	}

	protected onManualScroll(): void {
		this.manualScrollAt = Date.now();
	}

	protected seekTo(positionMs: number): void {
		this.player.seek(positionMs - this.offsetMs());
	}

	protected seekFromBar(event: MouseEvent): void {
		const bar = event.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const ratio = (event.clientX - rect.left) / rect.width;
		this.player.seek(ratio * this.player.durationMs());
	}

	protected seekBy(deltaMs: number): void {
		if (!this.player.canSeek()) {
			return;
		}
		const target = this.positionMs() + deltaMs;
		this.player.seek(
			Math.min(Math.max(target, 0), this.player.durationMs())
		);
	}

	/** A bass hit of the real sound: embers and a soft flash. */
	private onBeat(strength: number): void {
		const effects = this.effects();
		if (effects === 'off') {
			return;
		}
		this.embers?.boost((effects === 'full' ? 0.6 : 0.3) * (0.5 + strength));
		this.flash()?.nativeElement.animate(
			[
				{
					opacity:
						(effects === 'full' ? 0.12 : 0.05) * (0.5 + strength),
				},
				{ opacity: 0 },
			],
			{ duration: 350, easing: 'ease-out' }
		);
	}

	protected toggleAudioCapture(): void {
		if (this.player.audioStatus() === 'on') {
			this.player.stopAudioCapture();
		} else {
			void this.player.startAudioCapture();
		}
	}

	protected setVolume(event: Event): void {
		this.player.setVolume(Number((event.target as HTMLInputElement).value));
	}

	protected nudge(direction: -1 | 1): void {
		this.offsetMs.update((offset) => offset + direction * OFFSET_STEP_MS);
	}

	private centerLine(element: HTMLElement | undefined): void {
		const scroller = this.scroller()?.nativeElement;
		if (
			!element ||
			!scroller ||
			Date.now() - this.manualScrollAt < MANUAL_SCROLL_PAUSE_MS
		) {
			return;
		}
		scroller.scrollTo({
			top:
				element.offsetTop -
				scroller.clientHeight / 2 +
				element.clientHeight / 2,
			behavior: this.effects() === 'off' ? 'auto' : 'smooth',
		});
	}
}
