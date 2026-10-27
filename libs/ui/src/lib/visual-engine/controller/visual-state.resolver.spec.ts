import { SongVisualProfile } from '../model';
import { THE_NEW_ORDER_PROFILE } from '../profile';
import {
	applyOverrides,
	easeVisualState,
	neutralVisualState,
	targetVisualState,
} from './visual-state.resolver';

const profile: SongVisualProfile = THE_NEW_ORDER_PROFILE;

describe('targetVisualState', () => {
	it('drives light, particles and camera up with intensity', () => {
		const quiet = targetVisualState(profile, 0, null);
		const loud = targetVisualState(profile, 1, null);

		expect(loud.light).toBeGreaterThan(quiet.light);
		expect(loud.particleSpeed).toBeGreaterThan(quiet.particleSpeed);
		expect(loud.particleDensity).toBeGreaterThan(quiet.particleDensity);
		expect(loud.camera).toBeGreaterThan(quiet.camera);
	});

	it('thickens the fog and the dark as the song gets quieter', () => {
		const quiet = targetVisualState(profile, 0, null);
		const loud = targetVisualState(profile, 1, null);

		expect(quiet.fog).toBeGreaterThan(loud.fog);
		expect(quiet.darkness).toBeGreaterThan(loud.darkness);
	});

	it('gives a chorus more particles than a breakdown at equal intensity', () => {
		const chorus = targetVisualState(profile, 0.6, 'chorus');
		const breakdown = targetVisualState(profile, 0.6, 'breakdown');

		expect(chorus.particleDensity).toBeGreaterThan(
			breakdown.particleDensity
		);
		expect(breakdown.fog).toBeGreaterThan(chorus.fog);
	});

	it('only turns the scene surreal during a solo', () => {
		expect(targetVisualState(profile, 0.9, 'solo').surreal).toBe(1);
		expect(targetVisualState(profile, 0.9, 'chorus').surreal).toBeLessThan(
			0.2
		);
	});
});

describe('easeVisualState', () => {
	it('moves towards the target without arriving in one frame', () => {
		const state = neutralVisualState();
		const target = targetVisualState(profile, 1, 'chorus');
		const before = state.light;

		easeVisualState(state, target, 1 / 60);

		expect(state.light).toBeGreaterThan(before);
		expect(state.light).toBeLessThan(target.light);
	});

	it('lets light settle sooner than fog, so a change reads as weather', () => {
		const fast = neutralVisualState();
		const slow = neutralVisualState();
		const target = targetVisualState(profile, 1, 'chorus');

		for (let i = 0; i < 60; i++) {
			easeVisualState(fast, target, 1 / 60);
			easeVisualState(slow, target, 1 / 60);
		}

		const lightLeft = Math.abs(target.light - fast.light) / target.light;
		const fogLeft = Math.abs(target.fog - slow.fog) / target.fog;
		expect(lightLeft).toBeLessThan(fogLeft);
	});

	it('is independent of the frame rate', () => {
		const sixty = neutralVisualState();
		const thirty = neutralVisualState();
		const target = targetVisualState(profile, 1, 'chorus');

		for (let i = 0; i < 120; i++) {
			easeVisualState(sixty, target, 1 / 60);
		}
		for (let i = 0; i < 60; i++) {
			easeVisualState(thirty, target, 1 / 30);
		}

		expect(sixty.light).toBeCloseTo(thirty.light, 4);
	});
});

describe('applyOverrides', () => {
	it('pins a value without waiting for the smoothing', () => {
		const state = neutralVisualState();

		applyOverrides(state, { fog: 1.4, glow: 0 });

		expect(state.fog).toBe(1.4);
		expect(state.glow).toBe(0);
	});

	it('leaves the state alone when nothing is pinned', () => {
		const state = neutralVisualState();

		expect(applyOverrides(state, null)).toEqual(neutralVisualState());
	});
});
