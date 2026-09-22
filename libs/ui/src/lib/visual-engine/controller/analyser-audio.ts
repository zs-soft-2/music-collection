import { AudioFeatures, SILENT_AUDIO } from '../model';
import { approach, clamp01 } from './math';

const BASS_HZ = 160;
const MID_HZ = 2000;
const TREBLE_HZ = 9000;

/**
 * Real audio, when there is any. The app can already share the tab's sound as
 * an `AnalyserNode`; this turns that into the same normalised features the
 * simulator produces, so the engine cannot tell the difference.
 */
export class AnalyserAudioSource {
	private analyser: AnalyserNode | null = null;
	private spectrum = new Uint8Array(0);

	private bassTo = 1;
	private midTo = 1;
	private trebleTo = 1;

	/** A slow average of the bass, so a beat is a departure from it. */
	private bassFloor = 0;
	private beat = 0;

	private readonly features: AudioFeatures = { ...SILENT_AUDIO };

	public setAnalyser(analyser: AnalyserNode | null): void {
		this.analyser = analyser;
		if (!analyser) {
			this.spectrum = new Uint8Array(0);
			return;
		}

		const bins = analyser.frequencyBinCount;
		const binHz = analyser.context.sampleRate / analyser.fftSize;
		this.spectrum = new Uint8Array(bins);
		this.bassTo = Math.min(bins, Math.max(1, Math.round(BASS_HZ / binHz)));
		this.midTo = Math.min(
			bins,
			Math.max(this.bassTo + 1, Math.round(MID_HZ / binHz))
		);
		this.trebleTo = Math.min(
			bins,
			Math.max(this.midTo + 1, Math.round(TREBLE_HZ / binHz))
		);
		this.bassFloor = 0;
	}

	public get available(): boolean {
		return this.analyser !== null;
	}

	/** Reads the spectrum into the same object every frame; never allocates. */
	public sample(seconds: number): AudioFeatures | null {
		if (!this.analyser || this.spectrum.length === 0) {
			return null;
		}
		this.analyser.getByteFrequencyData(this.spectrum);

		const bass = this.average(0, this.bassTo);
		const mid = this.average(this.bassTo, this.midTo);
		const treble = this.average(this.midTo, this.trebleTo);
		const volume = this.average(0, this.spectrum.length);

		// A beat is bass well above where the bass has been sitting. The floor
		// follows slowly, so a loud section does not read as one long beat.
		this.bassFloor = approach(this.bassFloor, bass, seconds, 0.45);
		const kick = clamp01((bass - this.bassFloor) * 4);
		this.beat = Math.max(kick, this.beat - seconds * 3.2);

		this.features.volume = volume;
		this.features.bass = bass;
		this.features.mid = mid;
		this.features.treble = treble;
		this.features.beat = this.beat;
		this.features.energy = clamp01(volume * 0.6 + bass * 0.25 + mid * 0.25);
		return this.features;
	}

	private average(from: number, to: number): number {
		let total = 0;
		for (let i = from; i < to; i++) {
			total += this.spectrum[i];
		}
		return to > from ? total / (to - from) / 255 : 0;
	}
}
