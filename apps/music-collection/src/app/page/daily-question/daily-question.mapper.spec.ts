import {
	DailyAnswer,
	DailyQuestionEntity,
	EntityTypeEnum,
} from '@music-collection/api';

import {
	toEdition,
	toFrame,
	toFrameKey,
	toOptions,
	toSubjectLink,
} from './daily-question.mapper';

const DAY = '2026-09-24';

const question = (
	overrides: Partial<DailyQuestionEntity> = {}
): DailyQuestionEntity => ({
	uid: DAY,
	day: DAY,
	entityType: EntityTypeEnum.DailyQuestion,
	templateKey: 'openingTrack',
	difficulty: 'medium',
	params: { album: 'Master of Puppets', artist: 'Metallica' },
	options: [
		{ id: 'track-1', label: 'Battery' },
		{ id: 'track-2', label: 'Master of Puppets' },
		{ id: 'track-3', label: 'The Thing That Should Not Be' },
		{ id: 'track-4', label: 'Welcome Home (Sanitarium)' },
	],
	...overrides,
});

const answer = (overrides: Partial<DailyAnswer> = {}): DailyAnswer => ({
	day: DAY,
	optionId: 'track-1',
	answerId: 'track-1',
	correct: true,
	templateKey: 'openingTrack',
	difficulty: 'medium',
	subject: { kind: 'album', uid: 'album-motp', name: 'Master of Puppets' },
	points: 20,
	streak: 1,
	answeredAt: 1774000000000,
	...overrides,
});

describe('toEdition', () => {
	it('évet és országot ír egymás mellé', () => {
		expect(toEdition({ year: '1986', country: 'US' })).toBe('1986 US');
	});

	it('a hiányzó felét elhagyja', () => {
		expect(toEdition({ year: '1986', country: '' })).toBe('1986');
		expect(toEdition({ year: '', country: 'US' })).toBe('US');
		expect(toEdition({})).toBe('');
	});
});

describe('toFrameKey', () => {
	it('a kiadót a kiadás megnevezésével kérdezi, ha van mivel', () => {
		expect(toFrameKey('releaseLabel', { year: '1986' })).toBe(
			'releaseLabelEdition'
		);
	});

	it('a kiadás megnevezése nélkül a rövid kerettel kérdez', () => {
		expect(toFrameKey('releaseLabel', { year: '', country: '' })).toBe(
			'releaseLabel'
		);
	});

	it('a katalógusszámhoz a kiadót is odaírja, ha ismert', () => {
		expect(toFrameKey('releaseCatno', { label: 'Elektra' })).toBe(
			'releaseCatnoLabel'
		);
		expect(toFrameKey('releaseCatno', { label: '' })).toBe('releaseCatno');
	});

	// A szerver hamarabb tudhat egy sablont, mint ahogy a fordítás megjön.
	it('az ismeretlen sablont nem hagyja kulcsként a lapra kerülni', () => {
		expect(toFrameKey('producerOfTheAlbum', {})).toBe('fallback');
	});
});

describe('toFrame', () => {
	it('a keret mellé a katalógusértékeket is odaadja', () => {
		expect(toFrame(question())).toEqual({
			key: 'dailyQuestion.template.openingTrack',
			params: {
				album: 'Master of Puppets',
				artist: 'Metallica',
				edition: '',
			},
		});
	});
});

describe('toOptions', () => {
	it('tipp előtt csak a kiválasztott opciót jelöli', () => {
		const options = toOptions(question(), null, 'track-3');

		expect(options.filter((option) => option.picked)).toHaveLength(1);
		expect(options.every((option) => !option.correct)).toBe(true);
		expect(options.every((option) => !option.missed)).toBe(true);
	});

	it('a jó tipp után a helyes válasz látszik', () => {
		const options = toOptions(question(), answer(), null);

		expect(options.find((option) => option.correct)?.id).toBe('track-1');
		expect(options.every((option) => !option.missed)).toBe(true);
	});

	it('a rossz tipp után a választott és a helyes is látszik', () => {
		const options = toOptions(
			question(),
			answer({ optionId: 'track-2', correct: false }),
			null
		);

		expect(options.find((option) => option.missed)?.id).toBe('track-2');
		expect(options.find((option) => option.correct)?.id).toBe('track-1');
	});
});

describe('toSubjectLink', () => {
	it('albumra, előadóra, kiadásra mutat', () => {
		expect(
			toSubjectLink({ kind: 'album', uid: 'a-1', name: 'Kill Em All' })
		).toEqual(['/album', 'a-1']);
		expect(
			toSubjectLink({ kind: 'artist', uid: 'r-1', name: 'Metallica' })
		).toEqual(['/artist', 'r-1']);
		expect(
			toSubjectLink({ kind: 'release', uid: 'p-1', name: 'US pressing' })
		).toEqual(['/release', 'p-1']);
	});

	// A track lapja az albumot is kéri az útvonalban, a subject nem hozza.
	it('számra és semmire nem ad linket', () => {
		expect(
			toSubjectLink({ kind: 'track', uid: 't-1', name: 'Battery' })
		).toBeNull();
		expect(toSubjectLink(null)).toBeNull();
	});
});
