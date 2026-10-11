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
	cleanHint,
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
