import { parseYoutubePlaylistId, parseYoutubeVideoId } from './youtube-link';

describe('parseYoutubeVideoId', () => {
	it.each([
		['dQw4w9WgXcQ'],
		['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'],
		['https://youtu.be/dQw4w9WgXcQ?si=abc'],
		['youtube.com/shorts/dQw4w9WgXcQ'],
		['https://www.youtube.com/embed/dQw4w9WgXcQ'],
		[
			'https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=OLAK5uy_abcdefghijk',
		],
	])('reads %s', (link) => {
		expect(parseYoutubeVideoId(link)).toBe('dQw4w9WgXcQ');
	});

	it.each([
		[''],
		[null],
		['https://vimeo.com/123'],
		['https://youtu.be/short'],
	])('rejects %s', (link) => {
		expect(parseYoutubeVideoId(link)).toBeNull();
	});
});

describe('parseYoutubePlaylistId', () => {
	const id = 'OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY';

	it.each([
		[id],
		[`https://music.youtube.com/playlist?list=${id}&si=x`],
		[`https://www.youtube.com/playlist?list=${id}`],
		[`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${id}`],
	])('reads %s', (link) => {
		expect(parseYoutubePlaylistId(link)).toBe(id);
	});

	it.each([
		[''],
		['https://music.youtube.com/browse/MPREb_abcdefghijk'],
		['https://example.com/playlist?list=' + id],
	])('rejects %s', (link) => {
		expect(parseYoutubePlaylistId(link)).toBeNull();
	});
});
