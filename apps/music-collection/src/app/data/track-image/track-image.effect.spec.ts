import { reorder } from './track-image.effect';

describe('reorder', () => {
	it('moves a picture one place later', () => {
		expect(reorder(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
	});

	it('moves a picture one place earlier', () => {
		expect(reorder(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
	});

	/**
	 * The first picture has nowhere earlier to go, and the last nowhere
	 * later. The same list comes back, which is what tells the caller there
	 * is nothing to write.
	 */
	it('leaves the list alone when there is nowhere to move to', () => {
		const list = ['a', 'b', 'c'];

		expect(reorder(list, 0, -1)).toBe(list);
		expect(reorder(list, 2, 3)).toBe(list);
		expect(reorder(list, 1, 1)).toBe(list);
	});

	it('never changes the list it was given', () => {
		const list = ['a', 'b'];

		reorder(list, 0, 1);

		expect(list).toEqual(['a', 'b']);
	});
});
