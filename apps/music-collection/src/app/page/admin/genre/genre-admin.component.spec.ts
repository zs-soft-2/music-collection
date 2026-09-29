import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { EntityTypeEnum, GenreEntity } from '@music-collection/api';
import { GenreEffect } from '@music-collection/domain/genre';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { GenreAdminComponent } from './genre-admin.component';

const rock: GenreEntity = {
	active: true,
	description: 'Rock, from the beat groups on.',
	entityType: EntityTypeEnum.Genre,
	name: 'Rock',
	slug: 'rock',
	styles: ['Doom', 'Thrash'],
	uid: 'rock',
};

/**
 * The page as an admin arrives at it. One change detection pass only, on
 * purpose: the row's buttons sat behind `*ngxPermissionsOnly` for a while,
 * whose view is created from a promise, and in a zoneless app the blocks
 * inside such a view are never drawn — the cell rendered empty and the row
 * lost its buttons. A second pass here would hide that again.
 */
async function setUp() {
	TestBed.resetTestingModule();
	await TestBed.configureTestingModule({
		imports: [GenreAdminComponent],
		providers: [
			provideI18nTesting(),
			{
				provide: GenreEffect,
				useValue: {
					taxonomy$: of([rock]),
					create$: jest.fn(),
					update$: jest.fn(),
					delete$: jest.fn(),
				},
			},
		],
	}).compileComponents();

	const fixture = TestBed.createComponent(GenreAdminComponent);

	fixture.detectChanges();

	return fixture;
}

describe('GenreAdminComponent', () => {
	it('lists a genre with its styles', async () => {
		const fixture = await setUp();
		const row: HTMLElement = fixture.nativeElement.querySelector('tbody tr');

		expect(row.textContent).toContain('Rock');
		expect(row.textContent).toContain('Doom, Thrash');
	});

	it('puts the edit and delete buttons at the end of the row', async () => {
		const fixture = await setUp();
		const actions: HTMLElement = fixture.nativeElement.querySelector(
			'.mc-stacked-actions'
		);
		const labels = [...actions.querySelectorAll('button')].map((button) =>
			button.getAttribute('aria-label')
		);

		expect(labels).toEqual(['Edit', 'Delete']);
	});

	it('opens the editor on the genre the edit button belongs to', async () => {
		const fixture = await setUp();
		const edit: HTMLButtonElement = fixture.nativeElement.querySelector(
			'.mc-stacked-actions button'
		);

		edit.click();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('#genre-name').value).toBe(
			'Rock'
		);
	});

	it('offers a way to add a genre', async () => {
		const fixture = await setUp();

		expect(
			fixture.nativeElement.querySelector('.mc-page-actions button')
		).not.toBeNull();
	});
});
