import { AudioFeatures } from '../model';
import { VisualTimelineSection } from '../model';
import { clamp01, noise } from './math';

/**
 * Plausible audio features without any audio. It reads the song's own timeline
 * for the broad shape and adds a pulse on the beat, which is enough to judge
 * how the scene responds before anyone solves provider audio access.
 */
export class FakeAudioSource {
	private beatPhase = 0;

	public constructor(
		private sections: VisualTimelineSection[] = [],
		/** Thrash sits high; the default is a fast but plausible tempo. */
		private bpm = 168
	) {}

	public setSections(sections: VisualTimelineSection[]): void {
		this.sections = sections;
	}

	public setBpm(bpm: number): void {
		this.bpm = Math.max(30, bpm);
	}

	public sample(seconds: number, position: number): AudioFeatures {
		this.beatPhase += (seconds * this.bpm) / 60;
		// A sharp attack that decays over the rest of the beat.
		const beat = Math.pow(1 - (this.beatPhase % 1), 6);

		const section = this.sections.find(
			(candidate) =>
				position >= candidate.start && position < candidate.end
		);
		const level = section?.intensity ?? 0.3;

		const wobble = (value: number) => (noise(value) - 0.5) * 2;

		const volume = clamp01(level * 0.9 + wobble(position * 1.7) * 0.08);
		const bass = clamp01(
			level * 0.8 + beat * 0.35 + wobble(position * 2.3) * 0.1
		);
		const mid = clamp01(level * 0.75 + wobble(position * 3.1) * 0.15);
		const treble = clamp01(
			level * 0.6 + beat * 0.15 + wobble(position * 5.4) * 0.2
		);
		const energy = clamp01(level * 0.85 + beat * 0.2);

		return { volume, bass, mid, treble, beat: clamp01(beat), energy };
	}
}
