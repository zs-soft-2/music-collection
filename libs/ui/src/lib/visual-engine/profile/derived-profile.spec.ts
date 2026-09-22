import { deriveVisualProfile } from './derived-profile';
import { resolveVisualProfile } from './visual-profiles';

const SONGS = [
	{
		artist: 'Testament',
		album: 'Practice What You Preach',
		song: 'Envy Life',
	},
	{ artist: 'Miles Davis', album: 'Kind of Blue', song: 'So What' },
	{
		artist: 'Kraftwerk',
		album: 'Trans-Europe Express',
		song: 'Europe Endless',
	},
	{ artist: 'Nick Drake', album: 'Pink Moon', song: 'Road' },
	{ artist: 'Rush', album: 'Hemispheres', song: 'La Villa Strangiato' },
];

describe('deriveVisualProfile', () => {
	it('gives the same song the same world every time', () => {
		expect(deriveVisualProfile(SONGS[0])).toEqual(
			deriveVisualProfile(SONGS[0])
		);
	});

	it('gives different songs different worlds', () => {
		const looks = SONGS.map((song) => {
			const profile = deriveVisualProfile(song);
			return JSON.stringify([
				profile.palette,
				profile.environment,
				profile.particles,
				profile.camera,
				profile.effects,
			]);
		});

		expect(new Set(looks).size).toBe(SONGS.length);
	});

	it('keeps two tracks of one record in the same world', () => {
		const first = deriveVisualProfile({
			artist: 'Testament',
			album: 'The Legacy',
			song: 'Over the Wall',
		});
		const second = deriveVisualProfile({
			artist: 'Testament',
			album: 'The Legacy',
			song: 'Burnt Offerings',
		});

		// Same city, same weather, same palette...
		expect(first.world).toBe(second.world);
		expect(first.palette).toEqual(second.palette);
		expect(first.environment).toEqual(second.environment);
		expect(first.particles.type).toBe(second.particles.type);

		// ...but not the same run through it.
		expect(first.id).not.toBe(second.id);
		expect(first.particles.speed).not.toBe(second.particles.speed);
		expect(first.camera.intensity).not.toBe(second.camera.intensity);
		expect(first.energy).not.toBe(second.energy);
	});

	it('spreads bands evenly across the families', () => {
		const counts = new Map<string, number>();
		const bands = 600;
		for (let i = 0; i < bands; i++) {
			// Two families can share an environment, so the mood words are
			// what identify one.
			const family = deriveVisualProfile({
				artist: `band ${i}`,
				album: 'A',
				song: 'B',
			}).mood.join();
			counts.set(family, (counts.get(family) ?? 0) + 1);
		}

		// Every family gets used, and none takes more than a third of the
		// shelf. A weak number stream used to pile most bands into one.
		expect(counts.size).toBe(6);
		expect(Math.max(...counts.values())).toBeLessThan(bands / 3);
	});

	it('makes two records of one band relatives, not strangers', () => {
		const legacy = deriveVisualProfile({
			artist: 'Testament',
			album: 'The Legacy',
			song: 'Over the Wall',
		});
		const practice = deriveVisualProfile({
			artist: 'Testament',
			album: 'Practice What You Preach',
			song: 'Envy Life',
		});

		// One band, one world: the family, the camera and the framing hold.
		expect(legacy.environment.type).toBe(practice.environment.type);
		expect(legacy.camera.movement).toBe(practice.camera.movement);
		expect(legacy.effects.vignette).toBe(practice.effects.vignette);

		// The record is its own evening, and its own city.
		expect(legacy.world).not.toBe(practice.world);
		expect(legacy.palette.primary).not.toBe(practice.palette.primary);
		expect(legacy.environment.fog).not.toBe(practice.environment.fog);
	});

	it('separates two bands playing the same family', () => {
		const one = deriveVisualProfile({
			artist: 'Testament',
			album: 'X',
			song: 'Y',
			genre: ['thrash metal'],
		});
		const other = deriveVisualProfile({
			artist: 'Kreator',
			album: 'X',
			song: 'Y',
			genre: ['thrash metal'],
		});

		expect(one.palette.primary).not.toBe(other.palette.primary);
	});

	it('lets the genre choose the family when we know it', () => {
		const thrash = deriveVisualProfile({
			artist: 'A',
			song: 'B',
			genre: ['thrash metal'],
		});
		const jazz = deriveVisualProfile({
			artist: 'A',
			song: 'B',
			genre: ['jazz'],
		});

		expect(thrash.environment.type).toBe('industrial');
		expect(['embers', 'dust']).toContain(thrash.particles.type);
		expect(jazz.environment.fog).toBeGreaterThan(thrash.environment.fog);
	});

	it('writes colours back as hex', () => {
		const profile = deriveVisualProfile(SONGS[1]);
		for (const colour of Object.values(profile.palette)) {
			expect(colour).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('keeps every value inside the range the engine expects', () => {
		for (const song of SONGS) {
			const profile = deriveVisualProfile(song);
			const values = [
				profile.environment.fog,
				profile.environment.darkness,
				profile.particles.density,
				profile.particles.speed,
				profile.camera.intensity,
				...Object.values(profile.effects),
			];
			for (const value of values) {
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThanOrEqual(1);
			}
		}
	});
});

describe('resolveVisualProfile', () => {
	it('prefers the authored profile', () => {
		const profile = resolveVisualProfile({
			artist: 'Testament',
			album: 'The New Order',
			song: 'The New Order',
		});

		expect(profile.id).toBe('testament-the-new-order-1988');
		expect(profile.timeline).toBeDefined();
	});

	it('derives one for everything else', () => {
		expect(resolveVisualProfile(SONGS[2]).id).toMatch(/^derived:/);
	});
});
