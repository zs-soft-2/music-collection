import { toEdition, toFrameKey, toQuestionFrame } from './question-frame';

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

describe('toQuestionFrame', () => {
	it('a keret mellé a katalógusértékeket is odaadja', () => {
		expect(
			toQuestionFrame('openingTrack', {
				album: 'Master of Puppets',
				artist: 'Metallica',
			})
		).toEqual({
			key: 'dailyQuestion.template.openingTrack',
			params: {
				album: 'Master of Puppets',
				artist: 'Metallica',
				edition: '',
			},
		});
	});

	// A régi kérdéseknél előfordul, hogy a mező egyszerűen nincs ott.
	it('értékek nélkül is keretet ad', () => {
		expect(toQuestionFrame('albumYear', undefined).params).toEqual({
			edition: '',
		});
	});
});
