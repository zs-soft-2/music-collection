import { AlbumRating } from '../../data/rating';
import { FinishedRecord } from '../player';
import { recordToAsk } from './verdict-prompt.store';

const FINISHED: FinishedRecord = {
	albumId: 'album-1',
	albumTitle: 'Powerslave',
	artistName: 'Iron Maiden',
	artistId: 'artist-1',
};

const rating = (albumId: string): AlbumRating => ({
	uid: albumId,
	albumId,
	albumTitle: 'Powerslave',
	artistName: 'Iron Maiden',
	artistId: 'artist-1',
	stars: 4,
	note: null,
	ratedAt: 1000,
});

describe('recordToAsk', () => {
	it('asks about a record that just played and was never judged', () => {
		expect(recordToAsk(FINISHED, [])).toBe(FINISHED);
		expect(recordToAsk(FINISHED, [rating('album-2')])).toBe(FINISHED);
	});

	it('leaves a record the collector already rated alone', () => {
		expect(recordToAsk(FINISHED, [rating('album-1')])).toBeNull();
	});

	it('has nothing to ask while nothing has finished', () => {
		expect(recordToAsk(null, [rating('album-1')])).toBeNull();
	});
});
