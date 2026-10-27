import { Injectable, inject } from '@angular/core';

import {
	AudioCapture,
	AudioCaptureRepository,
} from './audio-capture.repository';

/** Starts and stops the analysis of the tab's sound. */
@Injectable({ providedIn: 'root' })
export class AudioCaptureEffect {
	private readonly repository = inject(AudioCaptureRepository);

	public get supported(): boolean {
		return this.repository.supported;
	}

	public start(): Promise<AudioCapture> {
		return this.repository.start();
	}
}
