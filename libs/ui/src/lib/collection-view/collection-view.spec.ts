import { createCollectionView } from './collection-view';

describe('createCollectionView', () => {
	const key = 'mc.test.view';

	afterEach(() => localStorage.removeItem(key));

	it('starts as a table', () => {
		expect(createCollectionView(key).view()).toBe('table');
	});

	it('remembers the chosen view', () => {
		createCollectionView(key).setView('cards');

		expect(createCollectionView(key).view()).toBe('cards');
	});

	it('works without storage', () => {
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		const state = createCollectionView(key);

		state.setView('cards');

		expect(state.view()).toBe('cards');
		jest.restoreAllMocks();
	});
});
