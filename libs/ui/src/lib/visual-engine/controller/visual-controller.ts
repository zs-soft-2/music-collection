import {
	AudioFeatures,
	SILENT_AUDIO,
	SongSection,
	VisualInputMode,
} from '../model';
import { VisualTimelineSection } from '../model';
import { clamp, clamp01, noise } from './math';

/** What a controller hands the engine each frame. */
export interface VisualSignal {
	/** The intensity the scene should be heading towards, 0..1. */
	intensity: number;
	/** The section driving the look, or null to stay on the profile's own. */
	section: SongSection | null;
	/** A transient swell, 0..1, spent within a frame or two. */
	pulse: number;
}

export interface VisualController {
	readonly mode: VisualInputMode;
	update(seconds: number, elapsed: number): VisualSignal;
}

/**
 * The scene on its own. No player, no audio, no timeline — it simply breathes,
 * so the background is never dead while someone is picking the next record.
 */
export class AmbientController implements VisualController {
	public readonly mode: VisualInputMode = 'ambient';

	public constructor(
		private base = 0.38,
		private swing = 0.16,
		private pace = 1,
		private phase = 0
	) {}

	public setBase(base: number): void {
		this.base = clamp01(base);
	}

	/** How far the swell travels either side of the base. */
	public setSwing(swing: number): void {
		this.swing = clamp(swing, 0, 0.5);
	}

	/** How fast it breathes; 1 is the pace the waves were written at. */
	public setPace(pace: number): void {
		this.pace = clamp(pace, 0.25, 3);
	}

	/**
	 * Where in the waves this song starts. Without it every song would arrive
	 * at the same point of the same swell, which is exactly what makes two
	 * different scenes look like one animation.
	 */
	public setPhase(phase: number): void {
		this.phase = phase;
	}

	public update(_seconds: number, elapsed: number): VisualSignal {
		// Two slow waves of different periods, so the swell never repeats
		// obviously within a listening session.
		const time = elapsed * this.pace;
		const slow = noise(time * 0.035 + this.phase);
		const slower = noise(time * 0.011 + 31.7 + this.phase * 0.37);
		const drift = (slow * 0.6 + slower * 0.4 - 0.5) * 2;

		return {
			intensity: clamp01(this.base + drift * this.swing),
			section: null,
			pulse: 0,
		};
	}
}

/** How long the look takes to hand over at a section boundary. */
const HANDOVER_SECONDS = 3;

/**
 * Follows the playback position through the song's sections. The engine only
 * ever pushes a position in, so the same controller works for a real player,
 * a scrubbing user, or the fake transport in the lab.
 */
export class TimelineController implements VisualController {
	public readonly mode: VisualInputMode = 'timeline';

	private position = 0;

	public constructor(private sections: VisualTimelineSection[] = []) {}

	public setSections(sections: VisualTimelineSection[]): void {
		this.sections = sections;
	}

	/** Playback position in seconds from the start of the song. */
	public setPosition(seconds: number): void {
		this.position = Math.max(0, seconds);
	}

	public update(): VisualSignal {
		const index = this.sections.findIndex(
			(section) =>
				this.position >= section.start && this.position < section.end
		);
		if (index < 0) {
			return { intensity: 0.12, section: null, pulse: 0 };
		}

		const current = this.sections[index];
		const next = this.sections[index + 1];
		const toEnd = current.end - this.position;

		// Start moving towards the next section before it arrives, so the
		// scene is already leaning into a chorus when the chorus lands.
		if (next && toEnd < HANDOVER_SECONDS) {
			const blend = 1 - toEnd / HANDOVER_SECONDS;
			return {
				intensity:
					current.intensity +
					(next.intensity - current.intensity) * blend,
				section: blend > 0.5 ? next.section : current.section,
				pulse: 0,
			};
		}

		return {
			intensity: clamp01(current.intensity),
			section: current.section,
			pulse: 0,
		};
	}
}

/**
 * Turns normalised audio into intensity. It does not care whether a real
 * analyser produced the numbers — which is the point, because Spotify and
 * YouTube will not hand us their samples.
 */
export class AudioReactiveController implements VisualController {
	public readonly mode: VisualInputMode = 'audio-reactive';

	private features: AudioFeatures = SILENT_AUDIO;

	public setFeatures(features: AudioFeatures): void {
		this.features = features;
	}

	public update(): VisualSignal {
		const { volume, bass, energy, beat } = this.features;

		return {
			intensity: clamp01(energy * 0.5 + volume * 0.25 + bass * 0.25),
			section: null,
			pulse: clamp01(beat),
		};
	}
}
