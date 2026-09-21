import { toMusicBrainzId } from './artist-external';

describe('toMusicBrainzId', () => {
	const id = '1c225a00-c3d7-4156-9c3b-1dfb37692fa0';

	it('takes the id out of an artist page URL', () => {
		expect(toMusicBrainzId(`https://musicbrainz.org/artist/${id}`)).toBe(id);
	});

	it('takes it out of a URL with a tab and a query', () => {
		expect(
			toMusicBrainzId(
				`https://musicbrainz.org/artist/${id}/releases?page=2`
			)
		).toBe(id);
	});

	it('keeps a bare id, lowercased', () => {
		expect(toMusicBrainzId(`  ${id.toUpperCase()}  `)).toBe(id);
	});

	it('finds nothing in a release group URL', () => {
		expect(
			toMusicBrainzId(`https://musicbrainz.org/release-group/${id}`)
		).toBeNull();
	});

	it('finds nothing in a name, an empty value or a stray id', () => {
		expect(toMusicBrainzId('Iron Maiden')).toBeNull();
		expect(toMusicBrainzId('')).toBeNull();
		expect(toMusicBrainzId(null)).toBeNull();
		expect(toMusicBrainzId(`mbid ${id}`)).toBeNull();
	});
});
