import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Role } from '@music-collection/api';

import {
	HOLDERS_UNREADABLE,
	ROLE_ID_TAKEN,
	ROLE_NAME_TAKEN,
	RoleEffect,
	RoleInUseError,
} from './role.effect';
import { RoleRepository } from './role.repository';

const role = (uid: string, name: string, permissions: string[] = []): Role => ({
	name,
	permissions,
	uid,
});

const HELD = [
	role('USER', 'Gyűjtő'),
	role('EDITOR', 'EDITOR'),
];

interface FakeRepository {
	list$: jest.Mock<Observable<Role[]>>;
	create$: jest.Mock;
	update$: jest.Mock;
	delete$: jest.Mock;
	countHolders$: jest.Mock<Observable<number>>;
}

function setUp(
	roles: Role[] = HELD,
	overrides: Partial<FakeRepository> = {}
): { effect: RoleEffect; repository: FakeRepository } {
	const repository: FakeRepository = {
		list$: jest.fn(() => of(roles)),
		create$: jest.fn((uid: string) => of(role(uid, 'new'))),
		update$: jest.fn((uid: string) => of(role(uid, 'new'))),
		delete$: jest.fn(() => of(undefined)),
		countHolders$: jest.fn(() => of(0)),
		...overrides,
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			RoleEffect,
			{ provide: RoleRepository, useValue: repository },
		],
	});

	return { effect: TestBed.inject(RoleEffect), repository };
}

beforeEach(() => {
	jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('RoleEffect.roles$', () => {
	it('starts empty so a page draws before the first answer', async () => {
		const { effect } = setUp();

		expect(await firstValueFrom(effect.roles$)).toEqual([]);
	});

	it('finds one role by its document id', async () => {
		const { effect } = setUp();

		// Skip the placeholder the page is drawn with.
		const found = await new Promise<Role | null>((resolve) => {
			let seen = 0;

			effect.role$('EDITOR').subscribe((value) => {
				if (seen++) resolve(value);
			});
		});

		expect(found?.name).toBe('EDITOR');
	});
});

describe('RoleEffect.create$', () => {
	it('writes a role under the id its name spells out', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(
			effect.create$({
				name: 'Content editor',
				description: null,
				permissions: ['createAlbumEntity'],
			})
		);

		expect(repository.create$).toHaveBeenCalledWith(
			'CONTENT_EDITOR',
			expect.objectContaining({ name: 'Content editor' })
		);
	});

	/**
	 * Checked again at write time, not only in the editor: the list the page
	 * was drawn from may be a minute old by the time the button is pressed.
	 */
	it('refuses a name another role answers to', async () => {
		const { effect, repository } = setUp();

		await expect(
			firstValueFrom(
				effect.create$({
					name: 'editor',
					description: null,
					permissions: [],
				})
			)
		).rejects.toThrow(ROLE_NAME_TAKEN);
		expect(repository.create$).not.toHaveBeenCalled();
	});

	it('refuses a name whose id is taken by a renamed role', async () => {
		const { effect } = setUp();

		await expect(
			firstValueFrom(
				effect.create$({
					name: 'User',
					description: null,
					permissions: [],
				})
			)
		).rejects.toThrow(ROLE_ID_TAKEN);
	});
});

describe('RoleEffect.update$', () => {
	it('lets a role keep its own name', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(
			effect.update$('EDITOR', {
				name: 'EDITOR',
				description: 'Edits the catalog',
				permissions: [],
			})
		);

		expect(repository.update$).toHaveBeenCalled();
	});

	it('refuses to rename a role onto another one', async () => {
		const { effect } = setUp();

		await expect(
			firstValueFrom(
				effect.update$('EDITOR', {
					name: 'gyűjtő',
					description: null,
					permissions: [],
				})
			)
		).rejects.toThrow(ROLE_NAME_TAKEN);
	});
});

describe('RoleEffect.delete$', () => {
	it('deletes a role nobody holds', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(effect.delete$(HELD[1]));

		expect(repository.delete$).toHaveBeenCalledWith('EDITOR');
	});

	it('refuses one that users still hold, and says how many', async () => {
		const { effect, repository } = setUp(HELD, {
			countHolders$: jest.fn(() => of(3)),
		});

		await expect(firstValueFrom(effect.delete$(HELD[0]))).rejects.toThrow(
			RoleInUseError
		);
		expect(repository.delete$).not.toHaveBeenCalled();
	});

	/**
	 * "Nobody holds it" and "I was not allowed to ask" lead to opposite
	 * decisions, so the unreadable answer must never pass for zero.
	 */
	it('refuses to delete when it may not ask who holds the role', async () => {
		const { effect, repository } = setUp(HELD, {
			countHolders$: jest.fn(() =>
				throwError(() => new Error('permission-denied'))
			),
		});

		await expect(firstValueFrom(effect.delete$(HELD[0]))).rejects.toThrow(
			HOLDERS_UNREADABLE
		);
		expect(repository.delete$).not.toHaveBeenCalled();
	});
});

describe('RoleEffect.countHolders$', () => {
	it('answers null rather than nothing when the query is refused', async () => {
		const { effect } = setUp(HELD, {
			countHolders$: jest.fn(() =>
				throwError(() => new Error('permission-denied'))
			),
		});

		expect(await firstValueFrom(effect.countHolders$(HELD[0]))).toBeNull();
	});
});
