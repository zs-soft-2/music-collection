import { DOCUMENT, Injectable, inject } from '@angular/core';

/** A running capture: the analyser to read and a way to end it. */
export interface AudioCapture {
	analyser: AnalyserNode;
	/**
	 * Called when the shared sound falls silent, and again when it comes
	 * back. A tab can be shared without a single sample ever arriving —
	 * the wrong tab was picked, the box was left unticked, or the music
	 * plays on another device — and nothing else would say so: the visuals
	 * simply go on improvising as if no one had shared anything.
	 */
	onSilence: ((silent: boolean) => void) | null;
	/** Fires once when the user stops sharing from the browser's bar. */
	ended: Promise<void>;
	stop(): void;
}

export class AudioCaptureError extends Error {}

/** How often the shared sound is checked for signs of life. */
const SILENCE_POLL_MS = 250;
/** This long without a sound, and the capture counts as silent. */
const SILENCE_MS = 2500;
/** Anything above this in any band counts as a sound, of 255. */
const SILENCE_FLOOR = 4;

/**
 * Captures this browser tab's own sound (Spotify's browser player, YouTube)
 * through the screen-share prompt with audio, and analyses it. The sound is
 * only measured, never played again. Chrome and Edge only.
 */
@Injectable({ providedIn: 'root' })
export class AudioCaptureRepository {
	private readonly document = inject(DOCUMENT);

	public get supported(): boolean {
		return !!this.document.defaultView?.navigator.mediaDevices
			?.getDisplayMedia;
	}

	public async start(): Promise<AudioCapture> {
		const mediaDevices = this.document.defaultView?.navigator.mediaDevices;
		if (!mediaDevices?.getDisplayMedia) {
			throw new AudioCaptureError(
				'This browser cannot capture tab audio. Try Chrome or Edge.'
			);
		}
		const stream = await mediaDevices.getDisplayMedia({
			// Chrome asks for video too; it is dropped at once.
			video: true,
			audio: {
				suppressLocalAudioPlayback: false,
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
			},
			// Non-standard Chrome hints: offer this tab first.
			preferCurrentTab: true,
			selfBrowserSurface: 'include',
		} as DisplayMediaStreamOptions);

		stream.getVideoTracks().forEach((track) => track.stop());
		const [audioTrack] = stream.getAudioTracks();
		if (!audioTrack) {
			stream.getTracks().forEach((track) => track.stop());
			throw new AudioCaptureError(
				'No sound was shared. Pick this tab and tick "Share tab audio".'
			);
		}

		const context = new AudioContext();
		const source = context.createMediaStreamSource(
			new MediaStream([audioTrack])
		);
		const analyser = context.createAnalyser();
		analyser.fftSize = 2048;
		analyser.smoothingTimeConstant = 0.72;
		// Not connected to the output: the tab plays the sound already.
		source.connect(analyser);

		const capture: AudioCapture = {
			analyser,
			onSilence: null,
			ended: Promise.resolve(),
			stop: () => undefined,
		};

		// Watched here rather than by whoever draws the bars: the drawing
		// stops with the view, and a backdrop that reads the same analyser
		// may never draw a bar at all.
		const spectrum = new Uint8Array(analyser.frequencyBinCount);
		let silentMs = 0;
		let silent = false;
		const watch = setInterval(() => {
			analyser.getByteFrequencyData(spectrum);
			let peak = 0;
			for (const value of spectrum) {
				peak = Math.max(peak, value);
			}
			silentMs = peak > SILENCE_FLOOR ? 0 : silentMs + SILENCE_POLL_MS;
			const now = silentMs >= SILENCE_MS;
			if (now !== silent) {
				silent = now;
				capture.onSilence?.(silent);
			}
		}, SILENCE_POLL_MS);

		const stop = () => {
			clearInterval(watch);
			audioTrack.stop();
			source.disconnect();
			void context.close();
		};
		capture.ended = new Promise<void>((resolve) =>
			audioTrack.addEventListener('ended', () => resolve(), {
				once: true,
			})
		);
		capture.stop = stop;
		return capture;
	}
}
