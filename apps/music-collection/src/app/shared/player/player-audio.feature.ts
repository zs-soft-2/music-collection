import { inject, signal } from '@angular/core';
import {
	patchState,
	signalStoreFeature,
	withMethods,
	withProps,
	withState,
} from '@ngrx/signals';

import { type AudioCapture, AudioCaptureEffect } from '../../data/audio';

interface PlayerAudioState {
	/** The tab's sound is analysed for the visuals. */
	audioStatus: 'off' | 'starting' | 'on';
	audioError: string | null;
}

/**
 * The tab's own sound, shared for the visuals to follow the music. Nothing
 * of the playing depends on it: it only listens to what plays.
 */
export function withPlayerAudio() {
	return signalStoreFeature(
		withState<PlayerAudioState>({
			audioStatus: 'off',
			audioError: null,
		}),
		withProps(() => ({
			/**
			 * The live analyser of the tab's sound. A plain signal: a browser
			 * object must not go into the (frozen) store state.
			 */
			analyser: signal<AnalyserNode | null>(null),
			/**
			 * The shared sound has gone quiet. Worth saying out loud: a capture
			 * that delivers nothing looks exactly like no capture at all, and
			 * the visuals go on improvising either way.
			 */
			audioSilent: signal(false),
		})),
		withMethods(
			(store, audioCaptureEffect = inject(AudioCaptureEffect)) => {
				let capture: AudioCapture | null = null;

				const stopCapture = () => {
					capture?.stop();
					capture = null;
					store.analyser.set(null);
					store.audioSilent.set(false);
					patchState(store, { audioStatus: 'off' });
				};

				return {
					/** Tab audio capture is possible in this browser. */
					audioCaptureSupported(): boolean {
						return audioCaptureEffect.supported;
					},

					/** Lets the visuals follow the music: asks to share the tab's sound. */
					async startAudioCapture(): Promise<void> {
						if (store.audioStatus() !== 'off') {
							return;
						}
						patchState(store, {
							audioStatus: 'starting',
							audioError: null,
						});
						try {
							capture = await audioCaptureEffect.start();
							store.analyser.set(capture.analyser);
							store.audioSilent.set(false);
							patchState(store, { audioStatus: 'on' });
							const current = capture;
							current.onSilence = (silent) => {
								if (capture === current) {
									store.audioSilent.set(silent);
								}
							};
							// Stopped from the browser's "sharing" bar.
							void current.ended.then(() => {
								if (capture === current) {
									stopCapture();
								}
							});
						} catch (error) {
							capture = null;
							// Cancelling the prompt is no error to show.
							const cancelled =
								error instanceof DOMException &&
								error.name === 'NotAllowedError';
							patchState(store, {
								audioStatus: 'off',
								audioError: cancelled
									? null
									: error instanceof Error
										? error.message
										: String(error),
							});
						}
					},

					stopAudioCapture(): void {
						stopCapture();
					},
				};
			}
		)
	);
}
