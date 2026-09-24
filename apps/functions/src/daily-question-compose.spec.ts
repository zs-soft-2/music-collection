import { createRandom, hashSeed } from './daily-question';
import { randomKey } from './daily-question-compose';

const random = () => createRandom(hashSeed('2026-09-24'));

describe('randomKey', () => {
	it('húsz karakteres, Firestore-szerű azonosítót ad', () => {
		expect(randomKey(random())).toMatch(/^[0-9A-Za-z]{20}$/);
	});

	it('ugyanabból a napból ugyanazt a kulcsot húzza', () => {
		expect(randomKey(random())).toBe(randomKey(random()));
	});
});
