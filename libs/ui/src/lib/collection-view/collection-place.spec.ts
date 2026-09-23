import { createCollectionPlace, pageWithin } from './collection-place';

describe('createCollectionPlace', () => {
	const key = 'mc.test';

	afterEach(() => {
		sessionStorage.removeItem(`${key}.page`);
		jest.restoreAllMocks();
	});

	it('starts at the top of both views', () => {
		const place = createCollectionPlace(key);

		expect(place.cards.first()).toBe(0);
		expect(place.cards.rows()).toBe(24);
		expect(place.table.first()).toBe(0);
		expect(place.table.rows()).toBe(10);
		expect(place.sort()).toEqual([]);
		expect(place.filterOf('name')).toBe('');
	});

	it('takes the rows a page shows from the list that asks for it', () => {
		const place = createCollectionPlace(key, { cards: 48, table: 50 });

		expect(place.cards.rows()).toBe(48);
		expect(place.table.rows()).toBe(50);
	});

	it('comes back to the page each view was left on', () => {
		const place = createCollectionPlace(key);

		place.cards.setPage(48, 24);
		place.table.setPage(30, 10);

		const reopened = createCollectionPlace(key);

		expect(reopened.cards.first()).toBe(48);
		expect(reopened.table.first()).toBe(30);
	});

	it('keeps the two views apart', () => {
		const place = createCollectionPlace(key);

		place.table.setPage(30, 10);

		expect(place.cards.first()).toBe(0);
	});

	it('comes back to the sorting it was left on', () => {
		createCollectionPlace(key).setSort([
			{ field: 'year', order: 1 },
			{ field: 'name', order: -1 },
		]);

		expect(createCollectionPlace(key).sort()).toEqual([
			{ field: 'year', order: 1 },
			{ field: 'name', order: -1 },
		]);
	});

	it('comes back to the search it was left on', () => {
		createCollectionPlace(key).setFilter('name', 'nirvana');

		expect(createCollectionPlace(key).filterOf('name')).toBe('nirvana');
	});

	it('keeps the filters apart', () => {
		const place = createCollectionPlace(key);

		place.setFilter('name', 'nevermind');
		place.setFilter('artist', 'nirvana');

		expect(place.filterOf('name')).toBe('nevermind');
		expect(place.filterOf('artist')).toBe('nirvana');
	});

	it('takes both views back to the top when the list is narrowed', () => {
		const place = createCollectionPlace(key);

		place.cards.setPage(48, 24);
		place.table.setPage(30, 10);
		place.setFilter('name', 'nirvana');

		expect(place.cards.first()).toBe(0);
		expect(place.table.first()).toBe(0);
	});

	it('works without storage', () => {
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		const place = createCollectionPlace(key);

		place.cards.setPage(48, 24);

		expect(place.cards.first()).toBe(48);
	});

	it('starts from the top when what is stored is broken', () => {
		sessionStorage.setItem(`${key}.page`, 'not json');

		expect(createCollectionPlace(key).cards.first()).toBe(0);
	});

	it('starts from the top when what is stored is from another day', () => {
		sessionStorage.setItem(`${key}.page`, JSON.stringify({ first: 48 }));

		const place = createCollectionPlace(key);

		expect(place.cards.first()).toBe(0);
		expect(place.table.rows()).toBe(10);
	});
});

describe('pageWithin', () => {
	it('keeps the page the list can show', () => {
		expect(pageWithin(24, 24, 300)).toBe(24);
	});

	it('gives the last page when the list has grown shorter', () => {
		expect(pageWithin(240, 24, 30)).toBe(24);
		expect(pageWithin(240, 24, 24)).toBe(0);
	});

	it('leaves the page alone while nothing is loaded', () => {
		expect(pageWithin(240, 24, 0)).toBe(240);
	});

	it('starts from the top of an odd page', () => {
		expect(pageWithin(-5, 24, 30)).toBe(0);
		expect(pageWithin(240, 0, 30)).toBe(240);
	});
});
