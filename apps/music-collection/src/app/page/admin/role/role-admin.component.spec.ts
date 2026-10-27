import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Role } from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { RoleEffect } from '../../../data/role';
import { RoleAdminComponent } from './role-admin.component';

const roles: Role[] = [
	{ name: 'ADMIN', permissions: ['ADMIN'], uid: 'ADMIN' },
	{
		description: 'Edits the catalog.',
		name: 'EDITOR',
		permissions: ['createAlbumEntity', 'updateAlbumEntity'],
		uid: 'EDITOR',
	},
];

/**
 * The page as an admin arrives at it. One change detection pass only, the way
 * the genre page is tested: a view created from a promise — as the permission
 * directive does — never draws the blocks inside it under zoneless change
 * detection, and a second pass here would hide that.
 */
async function setUp(holders = 2) {
	TestBed.resetTestingModule();
	await TestBed.configureTestingModule({
		imports: [RoleAdminComponent],
		providers: [
			provideI18nTesting(),
			provideRouter([]),
			{
				provide: RoleEffect,
				useValue: {
					roles$: of(roles),
					delete$: jest.fn(() => of(undefined)),
					countHolders$: jest.fn(() => of(holders)),
				},
			},
		],
	}).compileComponents();

	const fixture = TestBed.createComponent(RoleAdminComponent);

	fixture.detectChanges();

	return fixture;
}

describe('RoleAdminComponent', () => {
	it('lists a role with its name, id and description', async () => {
		const fixture = await setUp();
		const rows: HTMLElement[] = [
			...fixture.nativeElement.querySelectorAll('tbody tr'),
		];

		expect(rows).toHaveLength(2);
		expect(rows[1].textContent).toContain('EDITOR');
		expect(rows[1].textContent).toContain('Edits the catalog.');
	});

	/**
	 * What makes the list worth reading: how far a role reaches, rather than
	 * how many identifiers it happens to carry.
	 */
	it('shows how far a role reaches, group by group', async () => {
		const fixture = await setUp();
		const reach: HTMLElement =
			fixture.nativeElement.querySelectorAll('td.reach')[1];

		expect(reach.textContent).toContain('Catalog');
		expect(reach.textContent).toContain('2/');
	});

	it('calls the wildcard role what it is', async () => {
		const fixture = await setUp();
		const reach: HTMLElement =
			fixture.nativeElement.querySelector('td.reach');

		expect(reach.textContent).toContain('Full access');
	});

	/** A role matters because of who carries it; the answer is a click away. */
	it('links the holder count to the users who hold the role', async () => {
		const fixture = await setUp(3);
		const link: HTMLAnchorElement =
			fixture.nativeElement.querySelector('td.holders a');

		expect(link.textContent?.trim()).toBe('3');
		expect(link.getAttribute('href')).toContain('/admin/user');
	});

	it('offers editing, copying and deleting on every row', async () => {
		const fixture = await setUp();
		const actions: HTMLElement = fixture.nativeElement.querySelector(
			'.mc-stacked-actions'
		);
		const labels = [...actions.querySelectorAll('a, button')].map(
			(element) => element.getAttribute('aria-label')
		);

		expect(labels).toEqual(['Edit', 'Make a copy', 'Delete']);
	});

	/** Deleting a role somebody holds would leave them pointing at nothing. */
	it('will not let a held role be deleted', async () => {
		const fixture = await setUp(3);

		fixture.nativeElement
			.querySelectorAll('.mc-stacked-actions button')[0]
			.click();
		fixture.detectChanges();

		const confirm: HTMLButtonElement =
			fixture.nativeElement.querySelector('.mc-stacked-actions button');

		expect(confirm.disabled).toBe(true);
	});

	it('leads to the editor for a new role', async () => {
		const fixture = await setUp();
		const router = TestBed.inject(Router);
		const navigate = jest
			.spyOn(router, 'navigate')
			.mockResolvedValue(true);

		fixture.nativeElement
			.querySelector('.mc-page-actions button')
			.click();

		expect(navigate).toHaveBeenCalledWith(['/admin/role/new']);
	});

	/** The row's editor link is a real link: an admin opens roles in tabs. */
	it('links each role to its own editor', async () => {
		const fixture = await setUp();
		const link: HTMLAnchorElement =
			fixture.nativeElement.querySelector('tbody th a');

		expect(link.getAttribute('href')).toBe('/admin/role/edit/ADMIN');
	});
});
