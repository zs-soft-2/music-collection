// A `firebase-functions` az Auth SDK-t is behúzza, azon át egy ESM-only
// csomagot, amit a jest CommonJS-futtatója nem tölt be. A naplóból egy
// utánzat is elég — ez a teszt a promptokról és a keretről szól.
jest.mock('firebase-functions/v2', () => ({
	logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
	DEFAULT_TRACK_MEDIA_QUOTA,
	MEDIA_STYLE_VERSION,
	Song,
	TrackMediaError,
	buildClipPrompt,
	buildImagePrompt,
	writeClipPrompt,
	cleanHint,
	imageSource,
	profileOf,
	sanitizeTrackMediaQuota,
	trimLyrics,
} from './track-media';

const song: Song = {
	uid: 't1',
	name: 'Shine On',
	albumUid: 'a1',
	images: [
		{
			entityType: 'Document',
			uid: 'd1',
			name: 'Shine On — 1',
			filePath: 'https://example.test/one.webp',
		},
	],
};

describe('sanitizeTrackMediaQuota', () => {
	it('falls back to the defaults for a missing document', () => {
		expect(sanitizeTrackMediaQuota(undefined)).toEqual(
			DEFAULT_TRACK_MEDIA_QUOTA
		);
	});

	it('keeps limits an admin wrote', () => {
		expect(
			sanitizeTrackMediaQuota({ dailyClipLimit: 10, dailyImageLimit: 40 })
		).toEqual({ enabled: true, dailyClipLimit: 10, dailyImageLimit: 40 });
	});

	/** A mistyped limit must not be able to spend a month's budget. */
	it('caps the limits, and refuses one that is not a number', () => {
		expect(
			sanitizeTrackMediaQuota({ dailyClipLimit: 5000 }).dailyClipLimit
		).toBe(50);
		expect(
			sanitizeTrackMediaQuota({ dailyImageLimit: 50_000 }).dailyImageLimit
		).toBe(500);
		expect(
			sanitizeTrackMediaQuota({ dailyClipLimit: 'many' }).dailyClipLimit
		).toBe(DEFAULT_TRACK_MEDIA_QUOTA.dailyClipLimit);
	});

	it('reads the switch being turned off', () => {
		expect(sanitizeTrackMediaQuota({ enabled: false }).enabled).toBe(false);
	});

	/** Zero is an answer: nobody, today. */
	it('allows a limit of nothing', () => {
		expect(
			sanitizeTrackMediaQuota({ dailyClipLimit: 0 }).dailyClipLimit
		).toBe(0);
	});
});

describe('profileOf', () => {
	/*
	 * A sáv csak akkor megy ki, ha a hívó kért egyet. Egy bedrótozott
	 * alapértelmezés nem olcsóbb hívás volt, hanem semmilyen: a gateway
	 * profil-routere 409-cel (`QUALITY_PROFILE_UNAVAILABLE`) áll meg azon a
	 * sávon, amihez a katalógusban nincs modell rendelve, és szándékosan nem
	 * esik vissza egy másikra. Profil nélkül a gateway a sajátját választja.
	 */
	it('leaves the bracket out when nobody asked for one', () => {
		expect(profileOf(undefined)).toEqual({});
		expect('qualityProfile' in profileOf(undefined)).toBe(false);
	});

	it('carries the bracket the caller asked for', () => {
		expect(profileOf('premium')).toEqual({ qualityProfile: 'premium' });
	});
});

describe('imageSource', () => {
	/*
	 * Ahol a gateway mindkét mezőt megadja, a címet követjük: az a letárolt,
	 * egész fájl, a beágyazott példány pedig a válaszba fér bele.
	 */
	it('follows the url when both came back', () => {
		expect(imageSource({ url: 'https://a/kep.png', b64: 'QUJD' })).toEqual({
			url: 'https://a/kep.png',
		});
	});

	it('takes the inline copy when that is all there is', () => {
		expect(imageSource({ b64: 'QUJD' })).toEqual({ b64: 'QUJD' });
	});

	it('has nothing to take from an empty picture', () => {
		expect(imageSource(undefined)).toBeNull();
		expect(imageSource({})).toBeNull();
	});
});

describe('cleanHint', () => {
	it('keeps a line of direction, flattened', () => {
		expect(cleanHint('  a rainy\n street  ')).toBe('a rainy street');
	});

	it('cuts a caller who sent a prompt instead of a hint', () => {
		expect(cleanHint('x'.repeat(5000)).length).toBe(200);
	});

	it('answers with nothing for nothing', () => {
		expect(cleanHint(undefined)).toBe('');
		expect(cleanHint(null)).toBe('');
	});
});

describe('trimLyrics', () => {
	it('hands the words over, trimmed', () => {
		expect(trimLyrics('  one line\r\nanother  ')).toBe('one line\nanother');
	});

	it('cuts a lyric that never ends', () => {
		expect(trimLyrics('la '.repeat(5000)).length).toBe(4000);
	});

	it('answers with nothing for a song nobody has typed out', () => {
		expect(trimLyrics(undefined)).toBe('');
	});
});

describe('buildImagePrompt', () => {
	/** What the song is about comes from its words, through the scene. */
	it('draws the scene the lyrics gave, with the style locked', () => {
		const prompt = buildImagePrompt(
			song,
			'An hourglass over a drowned city at dusk.',
			'amber and ash',
			'wide shot'
		);

		expect(prompt).toContain('drowned city');
		expect(prompt).toContain('amber and ash');
		expect(prompt).toContain('wide shot');
		expect(prompt).toContain('35mm grain');
	});

	/** A song nobody has typed the words of still gets a picture. */
	it('falls back to the title when the lyrics gave nothing', () => {
		const prompt = buildImagePrompt(song, '', '', '');

		expect(prompt).toContain('Shine On');
		expect(prompt).toContain('35mm grain');
	});

	it('keeps the prompt within what a model reads', () => {
		expect(
			buildImagePrompt(song, 'neon '.repeat(500), '', '').length
		).toBeLessThanOrEqual(1200);
	});
});

describe('buildClipPrompt', () => {
	it('carries the scene, the movement and the style lock', () => {
		const prompt = buildClipPrompt(
			JSON.stringify({
				scene: 'A rain-lit street outside a record shop at night.',
				motion: 'A slow push in towards the window.',
			}),
			song
		);

		expect(prompt).toContain('rain-lit street');
		expect(prompt).toContain('slow push in');
		expect(prompt).toContain('35mm grain');
		expect(prompt).toContain('Shine On');
	});

	/**
	 * The schema is asked for, but a model that answers with prose still has
	 * something usable in it.
	 */
	it('takes plain prose as the scene', () => {
		expect(
			buildClipPrompt('A dusty tape deck on a window sill.', song)
		).toContain('dusty tape deck');
	});

	it('refuses an empty answer rather than ordering a blank clip', () => {
		expect(() => buildClipPrompt('   ', song)).toThrow(TrackMediaError);
		expect(() =>
			buildClipPrompt(JSON.stringify({ motion: 'pan' }), song)
		).toThrow(TrackMediaError);
	});

	it('keeps the prompt within what a model reads', () => {
		const long = JSON.stringify({ scene: 'neon '.repeat(2000) });

		expect(buildClipPrompt(long, song).length).toBeLessThanOrEqual(1200);
	});

	it('has a style version to read a stored prompt against', () => {
		expect(MEDIA_STYLE_VERSION).toBe(1);
	});
});

describe('writeClipPrompt', () => {
	const answered = (scene: unknown) =>
		jest.fn().mockResolvedValue({
			kind: 'result',
			output: { text: JSON.stringify(scene) },
		});

	const client = (execute: jest.Mock) =>
		({ execute }) as unknown as Parameters<typeof writeClipPrompt>[0];

	/**
	 * The video capability is only ever handed a prompt, and the song's
	 * pictures were drawn from these very words — reading them back with a
	 * vision model would be the same answer, one call dearer, and in a price
	 * bracket this tenant has no model in.
	 */
	it('writes the scene from the words, with no pictures and no bracket', async () => {
		const execute = answered({
			scene: 'A rain-lit street outside a record shop at night.',
			motion: 'A slow push in towards the window.',
		});

		const prompt = await writeClipPrompt(
			client(execute),
			song,
			'Rain on the window of the record shop'
		);

		const request = execute.mock.calls[0][0];

		expect(request.capability).toBe('text.complete');
		expect(request.qualityProfile).toBeUndefined();
		expect(request.input.images).toBeUndefined();
		expect(request.input.prompt).toContain('Rain on the window');
		expect(prompt).toContain('rain-lit street');
		expect(prompt).toContain('slow push in');
	});

	it('refuses a gateway answer with nothing in it', async () => {
		const execute = jest.fn().mockResolvedValue({ kind: 'refusal' });

		await expect(
			writeClipPrompt(client(execute), song, 'Rain on the window')
		).rejects.toThrow(TrackMediaError);
	});
});
