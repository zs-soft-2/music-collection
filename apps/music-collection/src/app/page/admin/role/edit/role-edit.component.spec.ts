import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Role } from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { NgxRolesService } from 'ngx-permissions';

import { RoleEffect } from '../../../../data/role';
import { RoleEditComponent } from './role-edit.component';

const editor: Role = {
	name: 'EDITOR',
	permissions: ['createAlbumEntity', 'updateAlbumEntity'],
	uid: 'EDITOR',
};

/** The editor as an admin arrives at it, in one change detection pass. */
async function setUp(roleId: string | null = 'EDITOR') {
	TestBed.resetTestingModule();
	await TestBed.configureTestingModule({
		imports: [RoleEditComponent],
		providers: [
			provideI18nTesting(),
			provideRouter([]),
			{
				provide: RoleEffect,
				useValue: {
					roles$: of([editor]),
					create$: jest.fn(),
					update$: jest.fn(),
					countHolders$: jest.fn(() => of(3)),
				},
			},
			{
				provide: NgxRolesService,
				useValue: { getRoles: () => ({ ADMIN: {} }) },
			},
			{
				provide: ActivatedRoute,
				useValue: {
					paramMap: of(
						convertToParamMap(roleId ? { roleId } : {})
					),
					queryParamMap: of(convertToParamMap({})),
				},
			},
		],
	}).compileComponents();

	const fixture = TestBed.createComponent(RoleEditComponent);

	fixture.detectChanges();

	return fixture;
}

describe('RoleEditComponent', () => {
	it('opens on the role named in the route', async () => {
		const fixture = await setUp();

		expect(fixture.nativeElement.querySelector('#role-name').value).toBe(
			'EDITOR'
		);
	});

	it('draws the permission grid with the wildcard above it', async () => {
		const fixture = await setUp();
		const page: HTMLElement = fixture.nativeElement;

		expect(page.querySelector('#role-wildcard')).not.toBeNull();
		expect(page.querySelectorAll('.grid').length).toBeGreaterThan(1);
		expect(page.textContent).toContain('Artist');
		expect(page.textContent).toContain('Admin pages');
	});

	/**
	 * The panel that makes this more than a form: a role is not one person's
	 * setting, so the page says what the save changes and whom it reaches.
	 */
	it('says how many users the role reaches', async () => {
		const fixture = await setUp();

		expect(fixture.nativeElement.textContent).toContain('Reaches 3');
	});

	it('says nothing changes until something does', async () => {
		const fixture = await setUp();

		expect(fixture.nativeElement.textContent).toContain(
			'The permissions do not change'
		);
	});

	it('shows what a tick would add, in words', async () => {
		const fixture = await setUp();
		const boxes: HTMLInputElement[] = [
			...fixture.nativeElement.querySelectorAll(
				'.grid input[type="checkbox"]'
			),
		];

		boxes[0].click();
		fixture.detectChanges();

		const impact: HTMLElement =
			fixture.nativeElement.querySelector('.is-added');

		expect(impact).not.toBeNull();
		expect(impact.textContent).toContain('Adds (1)');
	});

	/** The warnings are holes this database actually has. */
	it('warns when a permission opens a form the rules will refuse', async () => {
		const fixture = await setUp();

		fixture.componentInstance['store'].toggle({
			permissions: ['viewDocumentEditPage'],
			granted: true,
		});
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.findings').textContent).toContain(
			'the editor opens'
		);
	});

	it('starts empty when no role is named', async () => {
		const fixture = await setUp(null);

		expect(fixture.nativeElement.querySelector('#role-name').value).toBe(
			''
		);
	});
});
