import { TestBed } from '@angular/core/testing';

import {
	CatalogScope,
	CatalogScopeService,
	GENRE_SCOPE_LIMIT,
	GUEST_SCOPE_KEY,
	catalogScopeKey,
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

	it('serves the showcase until somebody says otherwise', () => {
		expect(scope().slugs()).toEqual([]);
		expect(scope().narrowed()).toBe(false);
		expect(scope().key()).toBe(GUEST_SCOPE_KEY);
	});

	it('gives an administrator the whole catalog, and remembers it', () => {
		scope().useSession(true);
		scope().useWholeCatalog(true);

		expect(scope().key()).toBe('');

		// Read back on the next start, before the roles have arrived.
		TestBed.resetTestingModule();
		expect(scope().whole()).toBe(true);
		expect(scope().key()).toBe('');
	});

	it('lets the genres win over the whole catalog', () => {
		scope().useSession(true);
		scope().useWholeCatalog(true);
		scope().choose(['rock']);

		expect(scope().key()).toBe(genreScopeKey(['rock']));
	});

	it('reads back what this browser was last set to', () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ genres: ['rock', 'jazz'] })
		);

		localStorage.setItem('mc-catalog-signed-in', 'true');

		// Synchronously, on construction: the first catalog query runs before
		// anything asynchronous could have told it which genres to load.
		expect(scope().slugs()).toEqual(['rock', 'jazz']);
		expect(scope().narrowed()).toBe(true);
		expect(scope().key()).toBe(genreScopeKey(['rock', 'jazz']));
	});

	it('gives a guest the showcase whatever this browser last followed', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ genres: ['rock'] }));

		expect(scope().narrowed()).toBe(false);
		expect(scope().key()).toBe(GUEST_SCOPE_KEY);
	});

	it('takes the genres and whole catalog of the account away on signing out', () => {
		const service = scope();

		service.useSession(true);
		service.useWholeCatalog(true);
		service.choose(['rock']);
		service.useSession(false);

		expect(service.key()).toBe(GUEST_SCOPE_KEY);
		expect(service.slugs()).toEqual([]);
		expect(service.whole()).toBe(false);
		expect(service.rolesKnown()).toBe(false);

		// Nor do they come back with the next start, signed in or not.
		TestBed.resetTestingModule();
		scope().useSession(true);
		expect(scope().key()).toBe(GUEST_SCOPE_KEY);
	});

	it('knows the roles once they have been told, whatever they are', () => {
		const service = scope();

		expect(service.rolesKnown()).toBe(false);
		service.useWholeCatalog(false);
		expect(service.rolesKnown()).toBe(true);
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

	it('takes an unreadable scope for no genre at all', () => {
		localStorage.setItem(STORAGE_KEY, 'not json');

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
		const seen: CatalogScope[] = [];

		service.useSession(true);
		service.scope$.subscribe((current) => seen.push(current));
		service.choose(['rock', 'jazz']);
		service.choose(['jazz', 'rock']);

		// The first is the scope in force at subscription, which a reader
		// has to have before anything changes; the reordering is not a
		// change and must not send every catalog list round again.
		expect(seen).toEqual([
			{ genres: [], guest: true },
			{ genres: ['rock', 'jazz'], guest: true },
		]);
	});

	it('does not send the lists round when the administrator follows genres', () => {
		const service = scope();
		const seen: string[] = [];

		service.useSession(true);
		service.choose(['rock']);
		service.scope$.subscribe((current) =>
			seen.push(catalogScopeKey(current))
		);
		service.useWholeCatalog(true);

		// Genres win either way: the same scope, so the same lists.
		expect(seen).toEqual([genreScopeKey(['rock'])]);
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
