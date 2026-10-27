/**
 * Normalised audio, 0..1 on every field. The renderer never learns whether
 * these came from a real analyser node, from a provider's track analysis, or
 * from the simulator in the lab.
 */
export interface AudioFeatures {
	volume: number;
	bass: number;
	mid: number;
	treble: number;
	beat: number;
	energy: number;
}

export const SILENT_AUDIO: AudioFeatures = {
	volume: 0,
	bass: 0,
	mid: 0,
	treble: 0,
	beat: 0,
	energy: 0,
};
