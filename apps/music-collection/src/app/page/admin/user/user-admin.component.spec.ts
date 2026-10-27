import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ActivatedRoute,
	convertToParamMap,
	provideRouter,
} from '@angular/router';
import {
	AuthenticationStateService,
	Role,
	User,
} from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { RoleEffect } from '../../../data/role';
import { UserRoleEffect } from '../../../data/user-role';
import { UserAdminComponent } from './user-admin.component';

const roles: Role[] = [
	{ name: 'ADMIN', permissions: ['ADMIN'], uid: 'ADMIN' },
	{ name: 'USER', permissions: ['createCollectionItemEntity'], uid: 'USER' },
];

const collector = {
	uid: 'collector-1',
	displayName: 'A Collector',
	email: 'collector@example.com',
	roleIds: ['USER'],
} as User;

/** The page as an admin arrives at it, in one change detection pass. */
async function setUp(
	effective: { permissions: string[]; roles: string[] } | null = null
) {
	TestBed.resetTestingModule();
	await TestBed.configureTestingModule({
		imports: [UserAdminComponent],
		providers: [
			provideI18nTesting(),
			provideRouter([]),
			{
				provide: ActivatedRoute,
				useValue: { queryParamMap: of(convertToParamMap({})) },
			},
			{ provide: RoleEffect, useValue: { roles$: of(roles) } },
			{
				provide: UserRoleEffect,
				useValue: {
					users$: of([collector]),
					assign$: jest.fn(() => of(undefined)),
					effectivePermissions$: jest.fn(() => of(effective)),
					resync$: jest.fn(() => of({ users: 1, changed: 0 })),
				},
			},
			{
				provide: AuthenticationStateService,
				useValue: {
					selectAuthenticatedUser$: () => of({ uid: 'admin-1' }),
				},
			},
		],
	}).compileComponents();

	const fixture = TestBed.createComponent(UserAdminComponent);

	fixture.detectChanges();

	return fixture;
}

describe('UserAdminComponent', () => {
	it('lists a user with the roles they hold', async () => {
		const fixture = await setUp();
		const row: HTMLElement = fixture.nativeElement.querySelector('tbody tr');

		expect(row.textContent).toContain('A Collector');
		expect(row.textContent).toContain('collector@example.com');
		expect(row.textContent).toContain('USER');
	});

	it('offers to edit the roles and to look at the permissions', async () => {
		const fixture = await setUp();
		const actions: HTMLElement = fixture.nativeElement.querySelector(
			'.mc-stacked-actions'
		);
		const labels = [...actions.querySelectorAll('button')].map((button) =>
			button.getAttribute('aria-label')
		);

		expect(labels).toEqual([
			'Edit roles',
			'Show effective permissions',
		]);
	});

	/**
	 * The roles are picked from the ones that exist, never typed: a
	 * permission comes from a role and nothing else.
	 */
	it('offers every role as a checkbox once the row is open', async () => {
		const fixture = await setUp();

		fixture.nativeElement
			.querySelector('.mc-stacked-actions button')
			.click();
		fixture.detectChanges();

		const options = fixture.nativeElement.querySelectorAll(
			'.user-role-option'
		);

		expect(options).toHaveLength(2);
		expect(fixture.nativeElement.textContent).toContain('full access');
	});
	/**
	 * Raw identifiers are not information. The same list sorted into the rows
	 * of the catalog is the fact an admin can check against what they meant.
	 */
	it('reads the effective permissions back as words', async () => {
		const fixture = await setUp({
			permissions: ['createAlbumEntity', 'updateAlbumEntity'],
			roles: ['EDITOR'],
		});

		fixture.nativeElement
			.querySelectorAll('.mc-stacked-actions button')[1]
			.click();
		fixture.detectChanges();

		const panel: HTMLElement =
			fixture.nativeElement.querySelector('.user-effective');

		expect(panel.textContent).toContain('Catalog');
		expect(panel.textContent).toContain('Album');
		expect(panel.textContent).toContain('Create');
	});
});
