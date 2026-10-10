import {
	MAX_SUBJECT_LENGTH,
	SCENE_NEGATIVE_PROMPT,
	SceneProbeInputError,
	buildProbePrompt,
	readProbeRequest,
} from './scene-probe-prompt';

const valid = {
	subject: 'the Bay Bridge seen from the Oakland shore',
	draft: 'nocturne',
	size: '1536x864',
	count: 3,
};

describe('readProbeRequest', () => {
	it('a jó kérést átengedi', () => {
		expect(readProbeRequest(valid)).toEqual(valid);
	});

	it('a tárgy sortöréseit egy szóközre húzza', () => {
		const request = readProbeRequest({
			...valid,
			subject: ' the Bay Bridge\n\n  at night ',
		});

		expect(request.subject).toBe('the Bay Bridge at night');
	});

	it('az üres tárgyat visszautasítja', () => {
		expect(() => readProbeRequest({ ...valid, subject: '   ' })).toThrow(
			SceneProbeInputError
		);
	});

	it('a túl hosszú tárgyat visszautasítja', () => {
		expect(() =>
			readProbeRequest({
				...valid,
				subject: 'a'.repeat(MAX_SUBJECT_LENGTH + 1),
			})
		).toThrow(SceneProbeInputError);
	});

	it('az ismeretlen stíluszárat visszautasítja', () => {
		expect(() => readProbeRequest({ ...valid, draft: 'noir' })).toThrow(
			SceneProbeInputError
		);
	});

	it('az ismeretlen méretet visszautasítja', () => {
		// A méret a gatewayen át a szolgáltatóhoz megy: egy szabad string ott
		// vagy hibát ad, vagy kifizetünk egy képet, amit senki nem kért.
		expect(() => readProbeRequest({ ...valid, size: '4096x4096' })).toThrow(
			SceneProbeInputError
		);
	});

	it('a képszámot a határok közé szorítja', () => {
		expect(readProbeRequest({ ...valid, count: 99 }).count).toBe(4);
		expect(readProbeRequest({ ...valid, count: 0 }).count).toBe(1);
		expect(readProbeRequest({ ...valid, count: 'sok' }).count).toBe(1);
	});
});

describe('buildProbePrompt', () => {
	it('a zárat a tárgy köré zárja, a tiltólistával együtt', () => {
		const built = buildProbePrompt(readProbeRequest(valid));

		expect(built.prompt).toContain(valid.subject);
		expect(built.prompt).toContain('at night');
		expect(built.prompt).toContain(SCENE_NEGATIVE_PROMPT);
		expect(built.negativePrompt).toBe(SCENE_NEGATIVE_PROMPT);
	});

	it('minden zár üres sávot kér a képkockába', () => {
		// A kép mögé cím kerül. Egy mindenhol zsúfolt háttéren nincs hova.
		for (const draft of ['nocturne', 'weathered', 'interior'] as const) {
			const built = buildProbePrompt(
				readProbeRequest({ ...valid, draft })
			);

			expect(built.prompt).toMatch(/empty space|flat darkness|vignetting/);
		}
	});

	it('minden zár tiltja a feliratot és az albumborítót', () => {
		for (const draft of ['nocturne', 'weathered', 'interior'] as const) {
			const built = buildProbePrompt(
				readProbeRequest({ ...valid, draft })
			);

			expect(built.prompt).toContain('album cover art');
			expect(built.prompt).toContain('text, letters, words');
		}
	});

	it('a zár nélküli próbán a tárgy maga az egész prompt', () => {
		const built = buildProbePrompt(
			readProbeRequest({ ...valid, draft: 'none' })
		);

		expect(built.prompt).toBe(valid.subject);
		expect(built.negativePrompt).toBe('');
	});
});
