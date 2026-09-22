import { DEMO_TIMELINE } from '../profile';
import { FakeAudioSource } from './fake-audio';
import {
	AmbientController,
	AudioReactiveController,
	TimelineController,
} from './visual-controller';

describe('TimelineController', () => {
	const controller = new TimelineController(DEMO_TIMELINE);

	it('reports the section the position sits in', () => {
		controller.setPosition(70);

		expect(controller.update().section).toBe('chorus');
	});

	it('leans into the next section before it arrives', () => {
		controller.setPosition(24.5);
		const early = controller.update();

		controller.setPosition(10);
		const intro = controller.update();

		expect(early.intensity).toBeGreaterThan(intro.intensity);
	});

	it('goes quiet past the end of the song', () => {
		controller.setPosition(9999);

		expect(controller.update().section).toBeNull();
	});

	it('survives a song with no timeline at all', () => {
		const empty = new TimelineController();
		empty.setPosition(30);

		expect(empty.update().intensity).toBeGreaterThan(0);
	});
});

describe('AmbientController', () => {
	it('breathes around its base without ever leaving 0..1', () => {
		const controller = new AmbientController(0.4, 0.2);
		const seen: number[] = [];

		for (let i = 0; i < 400; i++) {
			seen.push(controller.update(0.5, i * 0.5).intensity);
		}

		expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...seen)).toBeLessThanOrEqual(1);
		// It has to actually move, or the scene is dead.
		expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(0.05);
	});
});

describe('AudioReactiveController', () => {
	it('turns loud audio into a high intensity and a beat into a pulse', () => {
		const controller = new AudioReactiveController();
		controller.setFeatures({
			volume: 0.9,
			bass: 0.9,
			mid: 0.8,
			treble: 0.7,
			beat: 1,
			energy: 0.95,
		});

		const signal = controller.update();

		expect(signal.intensity).toBeGreaterThan(0.8);
		expect(signal.pulse).toBe(1);
	});

	it('stays dark until it is given anything', () => {
		expect(new AudioReactiveController().update().intensity).toBe(0);
	});
});

describe('FakeAudioSource', () => {
	it('follows the timeline, so a chorus reads louder than an intro', () => {
		const source = new FakeAudioSource(DEMO_TIMELINE);

		const intro = source.sample(1 / 60, 10);
		const introVolume = intro.volume;
		const chorus = source.sample(1 / 60, 70);

		expect(chorus.volume).toBeGreaterThan(introVolume);
	});

	it('produces a beat that comes and goes', () => {
		const source = new FakeAudioSource(DEMO_TIMELINE, 120);
		const beats: number[] = [];

		for (let i = 0; i < 60; i++) {
			beats.push(source.sample(1 / 60, 70).beat);
		}

		expect(Math.max(...beats)).toBeGreaterThan(0.5);
		expect(Math.min(...beats)).toBeLessThan(0.1);
	});
});
