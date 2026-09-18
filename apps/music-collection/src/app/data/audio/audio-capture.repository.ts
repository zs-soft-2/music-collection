import { DOCUMENT, Injectable, inject } from '@angular/core';

/** A running capture: the analyser to read and a way to end it. */
export interface AudioCapture {
	analyser: AnalyserNode;
	/** Fires once when the user stops sharing from the browser's bar. */
	ended: Promise<void>;
	stop(): void;
}

export class AudioCaptureError extends Error {}

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

		const stop = () => {
			audioTrack.stop();
			source.disconnect();
			void context.close();
		};
		const ended = new Promise<void>((resolve) =>
			audioTrack.addEventListener('ended', () => resolve(), {
				once: true,
			})
		);
		return { analyser, ended, stop };
	}
}
