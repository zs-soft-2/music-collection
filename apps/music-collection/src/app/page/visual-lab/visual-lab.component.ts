import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	inject,
	signal,
} from '@angular/core';

import {
	SongSection,
	THE_NEW_ORDER_PROFILE,
	VisualInputMode,
	VisualQuality,
	VisualState,
} from '@music-collection/ui/visual-engine';

import { VisualFrame, VisualSceneComponent } from '../../shared/visual-scene';

/** The knobs the panel can pin. Names match the fields on `VisualState`. */
const KNOBS = [
	{ key: 'intensity', label: 'Intenzitás', max: 1 },
	{ key: 'fog', label: 'Köd', max: 1.6 },
	{ key: 'fogSpeed', label: 'Ködsebesség', max: 2 },
	{ key: 'particleDensity', label: 'Részecskesűrűség', max: 1.6 },
	{ key: 'particleSpeed', label: 'Részecskesebesség', max: 2 },
	{ key: 'camera', label: 'Kameramozgás', max: 1 },
	{ key: 'light', label: 'Fényerő', max: 1.6 },
	{ key: 'glow', label: 'Ragyogás', max: 1.5 },
	{ key: 'shake', label: 'Rázkódás', max: 1 },
	{ key: 'darkness', label: 'Sötétség', max: 1 },
	{ key: 'vignette', label: 'Vignetta', max: 1 },
	{ key: 'surreal', label: 'Szürreális', max: 1 },
] as const;

type KnobKey = (typeof KNOBS)[number]['key'];

export const SECTIONS: SongSection[] = [
	'intro',
	'verse',
	'build',
	'chorus',
	'breakdown',
	'solo',
	'outro',
];

/** The panel only needs to be readable, not smooth, so it redraws at ~6 Hz. */
const PANEL_INTERVAL_MS = 160;
/** How often the fake transport advances. */
const CLOCK_MS = 100;

/**
 * A bench for the visual engine: the scene on a widescreen stage, a fake
 * transport that walks the demo timeline, and a panel for pinning every value
 * by hand. Nothing here talks to the real player — that is the point, because
 * judging how a chorus should feel is much easier when a chorus is one click
 * away.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-visual-lab',
	templateUrl: './visual-lab.component.html',
	styleUrls: ['./visual-lab.component.scss'],
	imports: [VisualSceneComponent],
})
export class VisualLabComponent {
	private readonly destroyRef = inject(DestroyRef);

	protected readonly profile = THE_NEW_ORDER_PROFILE;
	protected readonly knobs = KNOBS;
	protected readonly sections = SECTIONS;

	protected readonly mode = signal<VisualInputMode>('timeline');
	protected readonly quality = signal<VisualQuality>('high');
	protected readonly sectionOverride = signal<SongSection | null>(null);
	protected readonly manual = signal(false);
	protected readonly panelOpen = signal(true);
	protected readonly failure = signal<string | null>(null);

	protected readonly playing = signal(false);
	protected readonly positionSeconds = signal(0);

	protected readonly duration = this.profile.timeline?.at(-1)?.end ?? 240;

	/** Live readout from the engine, sampled rather than taken every frame. */
	protected readonly live = signal<Readonly<VisualState> | null>(null);
	protected readonly fps = signal(60);

	private readonly pinned = signal<Record<KnobKey, number>>(
		Object.fromEntries(KNOBS.map((knob) => [knob.key, 0])) as Record<
			KnobKey,
			number
		>
	);

	protected readonly overrides = computed(() =>
		this.manual() ? this.pinned() : null
	);

	protected readonly simulateAudio = computed(
		() => this.mode() === 'audio-reactive'
	);

	protected readonly currentSection = computed(() => {
		const pinnedSection = this.sectionOverride();
		if (pinnedSection) {
			return pinnedSection;
		}
		const at = this.positionSeconds();
		return (
			this.profile.timeline?.find(
				(part) => at >= part.start && at < part.end
			)?.section ?? null
		);
	});

	/** The timeline drawn as proportional blocks under the progress bar. */
	protected readonly segments = computed(() =>
		(this.profile.timeline ?? []).map((part) => ({
			...part,
			width: ((part.end - part.start) / this.duration) * 100,
		}))
	);

	private panelUpdatedAt = 0;

	public constructor() {
		let last = performance.now();
		const clock = setInterval(() => {
			const now = performance.now();
			const seconds = (now - last) / 1000;
			last = now;

			if (!this.playing()) {
				return;
			}
			const next = this.positionSeconds() + seconds;
			this.positionSeconds.set(next >= this.duration ? 0 : next);
		}, CLOCK_MS);

		this.destroyRef.onDestroy(() => clearInterval(clock));
	}

	protected onFrame(frame: VisualFrame): void {
		const now = performance.now();
		if (now - this.panelUpdatedAt < PANEL_INTERVAL_MS) {
			return;
		}
		this.panelUpdatedAt = now;
		this.fps.set(Math.round(frame.fps));

		// The engine mutates its state in place, so the panel takes a copy.
		this.live.set({ ...frame.state });
		if (!this.manual()) {
			this.pinned.set(this.readKnobs(frame.state));
		}
	}

	protected toggleManual(): void {
		// Seed the sliders from whatever is on screen, so turning manual
		// control on never makes the picture jump.
		const state = this.live();
		if (!this.manual() && state) {
			this.pinned.set(this.readKnobs(state));
		}
		this.manual.update((manual) => !manual);
	}

	protected setKnob(key: KnobKey, value: string): void {
		this.pinned.update((knobs) => ({ ...knobs, [key]: Number(value) }));
	}

	protected knobValue(key: KnobKey): number {
		return this.pinned()[key] ?? 0;
	}

	protected togglePlay(): void {
		this.playing.update((playing) => !playing);
	}

	protected seek(value: string): void {
		this.positionSeconds.set(Number(value));
	}

	protected skip(seconds: number): void {
		const next = this.positionSeconds() + seconds;
		this.positionSeconds.set(
			Math.max(0, Math.min(this.duration - 0.1, next))
		);
	}

	/** Jumps the transport to where a section starts, rather than pinning it. */
	protected jumpTo(section: SongSection): void {
		const part = this.profile.timeline?.find(
			(candidate) => candidate.section === section
		);
		if (part) {
			this.positionSeconds.set(part.start);
		}
		this.sectionOverride.set(section);
	}

	protected clearSection(): void {
		this.sectionOverride.set(null);
	}

	protected setMode(mode: VisualInputMode): void {
		this.mode.set(mode);
	}

	protected setQuality(quality: VisualQuality): void {
		this.quality.set(quality);
	}

	protected time(seconds: number): string {
		const total = Math.max(0, Math.floor(seconds));
		const minutes = Math.floor(total / 60);
		return `${minutes}:${String(total % 60).padStart(2, '0')}`;
	}

	private readKnobs(state: Readonly<VisualState>): Record<KnobKey, number> {
		return Object.fromEntries(
			KNOBS.map((knob) => [knob.key, state[knob.key]])
		) as Record<KnobKey, number>;
	}
}
