import { of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { EntityTypeEnum, GenreEntity } from '@music-collection/api';
import { GENRE_IN_USE, GenreEffect } from '@music-collection/domain/genre';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { GenreAdminStore } from './genre-admin.store';

const genre = (
	name: string,
	styles: string[] = [],
	fields: Partial<GenreEntity> = {}
): GenreEntity => ({
	active: true,
	description: null,
	entityType: EntityTypeEnum.Genre,
	name,
	slug: name.toLowerCase(),
	styles,
	uid: name.toLowerCase(),
	...fields,
});

interface FakeEffect {
	taxonomy$: ReturnType<typeof of<GenreEntity[]>>;
	create$: jest.Mock;
	update$: jest.Mock;
	delete$: jest.Mock;
}

function setUp(
	genres: GenreEntity[] = [genre('Rock', ['Thrash'])],
	overrides: Partial<FakeEffect> = {}
): {
	effect: FakeEffect;
	store: InstanceType<typeof GenreAdminStore>;
} {
	const effect: FakeEffect = {
		taxonomy$: of(genres),
		create$: jest.fn(() => of(genre('Jazz'))),
		update$: jest.fn(() => of(genre('Rock'))),
		delete$: jest.fn(() => of(undefined)),
		...overrides,
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			GenreAdminStore,
			{ provide: GenreEffect, useValue: effect },
		],
	});

	return { effect, store: TestBed.inject(GenreAdminStore) };
}

describe('GenreAdminStore', () => {
	it('reads the taxonomy when it opens', () => {
		const { store } = setUp([genre('Rock', ['Thrash']), genre('Jazz')]);

		expect(store.isLoading()).toBe(false);
		expect(store.genres().map(({ name }) => name)).toEqual([
			'Rock',
			'Jazz',
		]);
		expect(store.styleCount()).toBe(1);
	});

	describe('adding a genre', () => {
		it('cannot be saved without a name', () => {
			const { store } = setUp();

			store.add();
			expect(store.canSave()).toBe(false);

			store.setName('Jazz');
			expect(store.canSave()).toBe(true);
		});

		/**
		 * Two genres of one name would each offer their own styles for the
		 * same word, and nothing could say which a record meant.
		 */
		it('cannot be saved under a name the taxonomy already holds', () => {
			const { store } = setUp([genre('Rock')]);

			store.add();
			store.setName('rock');

			expect(store.canSave()).toBe(false);
		});

		it('keeps its own name while being edited', () => {
			const { store } = setUp([genre('Rock')]);

			store.edit(store.genres()[0]);
			store.setName('Rock');

			expect(store.canSave()).toBe(true);
		});

		it('writes what was typed', () => {
			const { effect, store } = setUp();

			store.add();
			store.setName('Jazz');
			store.setDescription('Jazz, from the big bands on.');
			store.setStyles(['Hard Bop']);
			store.save();

			expect(effect.create$).toHaveBeenCalledWith({
				name: 'Jazz',
				description: 'Jazz, from the big bands on.',
				styles: ['Hard Bop'],
				active: true,
			});
			expect(store.editor()).toBeNull();
		});
	});

	describe('the styles of a genre', () => {
		/**
		 * The chips field hands over whatever was typed into it, blank words
		 * and a second spelling of a style included.
		 */
		it('stay a set, in alphabetical order', () => {
			const { store } = setUp();

			store.add();
			store.setName('Jazz');
			store.setStyles(['Hard Bop', 'Free Jazz', 'hard bop', '  ']);

			expect(store.editor()?.draft.styles).toEqual([
				'Free Jazz',
				'Hard Bop',
			]);
		});

		it('are taken off by the field handing back the shorter list', () => {
			const { store } = setUp([genre('Rock', ['Thrash', 'Doom'])]);

			store.edit(store.genres()[0]);
			store.setStyles(['Doom']);

			expect(store.editor()?.draft.styles).toEqual(['Doom']);
		});
	});

	describe('editing a genre', () => {
		it('writes it under its own uid', () => {
			const { effect, store } = setUp([genre('Rock', ['Thrash'])]);

			store.edit(store.genres()[0]);
			store.setActive(false);
			store.save();

			expect(effect.update$).toHaveBeenCalledWith('rock', {
				name: 'Rock',
				description: null,
				styles: ['Thrash'],
				active: false,
			});
		});

		it('says so when the write fails, and keeps the editor open', () => {
			const { store } = setUp([genre('Rock')], {
				update$: jest.fn(() =>
					throwError(() => new Error('permission-denied'))
				),
			});

			store.edit(store.genres()[0]);
			store.save();

			expect(store.error()).toBe('permission-denied');
			expect(store.editor()).not.toBeNull();
			expect(store.isSaving()).toBe(false);
		});
	});

	describe('deleting a genre', () => {
		it('is asked for twice', () => {
			const { effect, store } = setUp([genre('Rock')]);

			store.askDeletion(store.genres()[0]);
			expect(effect.delete$).not.toHaveBeenCalled();

			store.confirmDeletion();
			expect(effect.delete$).toHaveBeenCalled();
			expect(store.pendingDeletion()).toBeNull();
		});

		it('is dropped when the confirmation is taken back', () => {
			const { effect, store } = setUp([genre('Rock')]);

			store.askDeletion(store.genres()[0]);
			store.cancelDeletion();
			store.confirmDeletion();

			expect(effect.delete$).not.toHaveBeenCalled();
		});

		/**
		 * The catalog still names it: the page says to retire it instead, so
		 * the styles already saved keep their genre.
		 */
		it('reports the genre being in use as such', () => {
			const { store } = setUp([genre('Rock')], {
				delete$: jest.fn(() =>
					throwError(() => new Error(GENRE_IN_USE))
				),
			});

			store.askDeletion(store.genres()[0]);
			store.confirmDeletion();

			expect(store.error()).toBe(GENRE_IN_USE);
		});
	});
});
