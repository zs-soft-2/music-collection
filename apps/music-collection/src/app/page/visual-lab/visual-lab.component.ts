import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	inject,
	signal,
} from '@angular/core';

import {
	DEMO_TIMELINE,
	SongSection,
	SongVisualProfile,
	VisualInputMode,
	VisualQuality,
	VisualState,
	WorldShape,
	resolveVisualProfile,
	worldShapeOf,
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

/** What the bench can stand in front of the engine. */
interface LabSubject {
	artist: string;
	album: string;
	song: string;
	/** One of the styles this shelf uses, as `StyleEnum` spells them. */
	style: string;
}

/**
 * One record per family, so stepping through the list walks every world the
 * engine can build. The point of the bench is to judge whether two records
 * look like two places, and that cannot be judged from one record.
 */
const SUBJECTS: LabSubject[] = [
	{
		artist: 'Testament',
		album: 'The New Order',
		song: 'The New Order',
		style: 'Thrash',
	},
	{
		artist: 'Mayhem',
		album: 'De Mysteriis Dom Sathanas',
		song: 'Freezing Moon',
		style: 'Black',
	},
	{
		artist: 'Candlemass',
		album: 'Epicus Doomicus Metallicus',
		song: 'Solitude',
		style: 'Doom',
	},
	{
		artist: 'At the Gates',
		album: 'Slaughter of the Soul',
		song: 'Blinded by Fear',
		style: 'Melodic Death',
	},
	{
		artist: 'Rush',
		album: 'Hemispheres',
		song: 'La Villa Strangiato',
		style: 'Progressive metal',
	},
	{
		artist: 'Morbid Angel',
		album: 'Altars of Madness',
		song: 'Immortal Rites',
		style: 'Death',
	},
	{
		artist: 'Helloween',
		album: 'Keeper of the Seven Keys',
		song: 'Eagle Fly Free',
		style: 'Power metal',
	},
	{
		artist: 'Killswitch Engage',
		album: 'Alive or Just Breathing',
		song: 'My Last Serenade',
		style: 'Metalcore',
	},
	{
		artist: 'Mötley Crüe',
		album: 'Dr. Feelgood',
		song: 'Kickstart My Heart',
		style: 'Glam Rock',
	},
	{
		artist: 'Free',
		album: 'Fire and Water',
		song: 'Mr. Big',
		style: 'Hard rock',
	},
	{
		artist: 'Nick Drake',
		album: 'Pink Moon',
		song: 'Road',
		style: 'Acoustic',
	},
	{
		artist: 'Voivod',
		album: 'Dimension Hatröss',
		song: 'Tribal Convictions',
		style: 'Technical Thrash',
	},
];

/**
 * What each motif looks like on screen, for the readout. Only the ones worth
 * naming are here: the framing numbers say nothing on their own.
 */
const MOTIF_LABELS: Partial<Record<keyof WorldShape, string>> = {
	blocks: 'háztömbök',
	ridge: 'hegygerinc',
	spike: 'csúcsok',
	dunes: 'dűnék',
	stacks: 'kémények',
	windows: 'kivilágított ablakok',
	arcade: 'árkádok',
	monolith: 'monolitok',
	arcs: 'gyűrűk',
	grid: 'neonrács',
	stars: 'csillagok',
	moon: 'égitest',
	aurora: 'sarki fény',
	nebula: 'gázköd',
	dawn: 'alkonysáv',
	storm: 'viharfelhő',
	smog: 'szmog',
	wet: 'nedves talaj',
	water: 'víztükör',
	sand: 'homok',
	fires: 'kohótüzek',
	beam: 'fénypászma',
	streaks: 'zuhogó eső',
	frame: 'oszlopok és kábel',
	branches: 'ágak',
};

/** Below this a motif is not visible, so naming it would only mislead. */
const MOTIF_FLOOR = 0.06;

/** The panel only needs to be readable, not smooth, so it redraws at ~6 Hz. */
const PANEL_INTERVAL_MS = 160;
/** How often the fake transport advances. */
const CLOCK_MS = 100;

/**
 * A bench for the visual engine: the scene on a widescreen stage, a record to
 * put in front of it, a fake transport that walks the demo timeline, and a
 * panel for pinning every value by hand. Nothing here talks to the real player
 * — that is the point, because judging how a chorus should feel is much easier
 * when a chorus is one click away.
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

	protected readonly knobs = KNOBS;
	protected readonly sections = SECTIONS;
	protected readonly subjects = SUBJECTS;

	protected readonly mode = signal<VisualInputMode>('timeline');
	protected readonly quality = signal<VisualQuality>('high');
	protected readonly sectionOverride = signal<SongSection | null>(null);
	protected readonly manual = signal(false);
	protected readonly panelOpen = signal(true);
	protected readonly failure = signal<string | null>(null);

	protected readonly playing = signal(false);
	protected readonly positionSeconds = signal(0);

	protected readonly subjectIndex = signal(0);
	/** What was typed in by hand, which wins over the list while it is set. */
	protected readonly typed = signal<LabSubject | null>(null);

	protected readonly subject = computed(
		() => this.typed() ?? SUBJECTS[this.subjectIndex()]
	);

	/**
	 * The profile under test. A record we have authored one for gets it; every
	 * other record gets the derived one, plus the demo timeline — the bench
	 * needs sections to jump between, and a derived profile has none.
	 */
	protected readonly profile = computed<SongVisualProfile>(() => {
		const subject = this.subject();
		const profile = resolveVisualProfile({
			artist: subject.artist,
			album: subject.album,
			song: subject.song,
			genre: subject.style ? [subject.style] : [],
		});
		return profile.timeline
			? profile
			: { ...profile, timeline: DEMO_TIMELINE };
	});

	/** The world the record stands in, named motif by motif. */
	protected readonly world = computed(() => worldShapeOf(this.profile()));

	protected readonly motifs = computed(() => {
		const world = this.world();
		return (Object.keys(MOTIF_LABELS) as (keyof WorldShape)[])
			.filter((motif) => world[motif] > MOTIF_FLOOR)
			.map((motif) => ({
				label: MOTIF_LABELS[motif] ?? motif,
				weight: world[motif],
			}))
			.sort((one, other) => other.weight - one.weight);
	});

	protected readonly swatches = computed(() => {
		const palette = this.profile().palette;
		return [
			palette.background,
			palette.primary,
			palette.secondary,
			palette.accent,
		];
	});

	protected readonly duration = computed(
		() => this.profile().timeline?.at(-1)?.end ?? 240
	);

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
			this.profile().timeline?.find(
				(part) => at >= part.start && at < part.end
			)?.section ?? null
		);
	});

	/** The timeline drawn as proportional blocks under the progress bar. */
	protected readonly segments = computed(() =>
		(this.profile().timeline ?? []).map((part) => ({
			...part,
			width: ((part.end - part.start) / this.duration()) * 100,
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
			this.positionSeconds.set(next >= this.duration() ? 0 : next);
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

	// --- which record is on the stage --------------------------------------

	protected pickSubject(index: string): void {
		this.typed.set(null);
		this.subjectIndex.set(Number(index));
	}

	protected stepSubject(by: number): void {
		this.typed.set(null);
		this.subjectIndex.update(
			(index) =>
				(index + by + SUBJECTS.length * 2) % SUBJECTS.length
		);
	}

	/** Anything off the shelf: type it in and the world follows. */
	protected type(field: keyof LabSubject, value: string): void {
		const current = this.typed() ?? { ...this.subject() };
		this.typed.set({ ...current, [field]: value });
	}

	protected typedValue(field: keyof LabSubject): string {
		return this.subject()[field];
	}

	protected clearTyped(): void {
		this.typed.set(null);
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
			Math.max(0, Math.min(this.duration() - 0.1, next))
		);
	}

	/** Jumps the transport to where a section starts, rather than pinning it. */
	protected jumpTo(section: SongSection): void {
		const part = this.profile().timeline?.find(
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
