import { TestBed } from '@angular/core/testing';

import {
	CatalogScopeService,
	GENRE_SCOPE_LIMIT,
	genreScopeKey,
	isGenreScoped,
} from './catalog-scope.service';

const STORAGE_KEY = 'mc-genre-scope';

describe('CatalogScopeService', () => {
	const scope = (): CatalogScopeService =>
		TestBed.inject(CatalogScopeService);

	beforeEach(() => {
		localStorage.clear();
		TestBed.resetTestingModule();
	});

	it('follows the whole catalog until somebody says otherwise', () => {
		expect(scope().slugs()).toEqual([]);
		expect(scope().narrowed()).toBe(false);
	});

	it('reads back what this browser was last set to', () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ genres: ['rock', 'jazz'] })
		);

		// Synchronously, on construction: the first catalog query runs before
		// anything asynchronous could have told it which genres to load.
		expect(scope().slugs()).toEqual(['rock', 'jazz']);
		expect(scope().narrowed()).toBe(true);
	});

	it('keeps a third genre out', () => {
		scope().choose(['rock', 'jazz', 'blues']);

		expect(scope().slugs()).toHaveLength(GENRE_SCOPE_LIMIT);
		expect(scope().slugs()).toEqual(['rock', 'jazz']);
	});

	it('writes the choice through at once', () => {
		scope().choose(['rock']);

		// Not from an effect: a collector who picks a genre and closes the
		// tab in the same breath has still picked it.
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
			genres: ['rock'],
		});
	});

	it('takes an unreadable scope for the whole catalog', () => {
		localStorage.setItem(STORAGE_KEY, 'not json');

		// Slower than it needs to be, but never a catalog with something
		// silently missing from it.
		expect(scope().slugs()).toEqual([]);
	});

	it('ignores anything in the key that is not a slug', () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ genres: ['rock', 7, null] })
		);

		expect(scope().slugs()).toEqual(['rock']);
	});

	it('emits a change once, and not for a reordering of the same scope', () => {
		const service = scope();
		const seen: string[][] = [];

		service.scope$.subscribe((slugs) => seen.push(slugs));
		service.choose(['rock', 'jazz']);
		service.choose(['jazz', 'rock']);

		// The first is the scope in force at subscription, which a reader
		// has to have before anything changes; the reordering is not a
		// change and must not send every catalog list round again.
		expect(seen).toEqual([[], ['rock', 'jazz']]);
	});
});

describe('genreScopeKey', () => {
	it('is the same for the same genres in either order', () => {
		expect(genreScopeKey(['rock', 'jazz'])).toBe(
			genreScopeKey(['jazz', 'rock'])
		);
	});

	it('tells the whole catalog from a narrowed one', () => {
		expect(genreScopeKey([])).toBe('');
		expect(genreScopeKey(['rock'])).not.toBe('');
	});
});

describe('isGenreScoped', () => {
	it('knows the features a genre bundle carries', () => {
		expect(isGenreScoped('album')).toBe(true);
		expect(isGenreScoped('musician')).toBe(true);
	});

	it('leaves alone what belongs to no one genre', () => {
		// A label puts out records of every genre, and the taxonomy itself
		// is a dozen documents — narrowing either saves nothing.
		expect(isGenreScoped('label')).toBe(false);
		expect(isGenreScoped('genre')).toBe(false);
		expect(isGenreScoped('collection-item')).toBe(false);
	});
});
