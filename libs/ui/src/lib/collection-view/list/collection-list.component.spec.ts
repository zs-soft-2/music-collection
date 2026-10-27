import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { createCollectionPlace } from '../collection-place';
import { createCollectionView } from '../collection-view';
import { CollectionColumnDirective } from './collection-column.directive';
import { CollectionListComponent } from './collection-list.component';

interface Record {
	uid: string;
	name: string;
	retired?: boolean;
}

const KEY = 'mc.test.list';

@Component({
	imports: [CollectionColumnDirective, CollectionListComponent],
	template: `
		<mc-collection-list
			[items]="records"
			[place]="place"
			[view]="view"
			[rowClass]="rowClass"
			[tableRowsOptions]="[1, 10]"
			emptyMessage="Nothing here."
		>
			<button tools type="button">Search</button>

			<p banner>A question.</p>

			<ng-template #card let-record>
				<span class="card">{{ record.name }}</span>
			</ng-template>

			<ng-template
				mcColumn
				header="Name"
				field="name"
				columnClass="wide"
				let-record
			>
				<span class="name">{{ record.name }}</span>
			</ng-template>

			<ng-template mcColumn header="Actions" headerHidden let-record>
				<button type="button">Edit {{ record.name }}</button>
			</ng-template>
		</mc-collection-list>
	`,
})
class HostComponent {
	public readonly place = createCollectionPlace(KEY);
	public readonly view = createCollectionView(`${KEY}.view`);
	public records: Record[] = [
		{ uid: '1', name: 'Nirvana' },
		{ uid: '2', name: 'Pixies', retired: true },
	];
	public readonly rowClass = (record: Record) =>
		record.retired ? 'is-retired' : '';
}

describe('CollectionListComponent', () => {
	let fixture: ComponentFixture<HostComponent>;

	const html = (): string => fixture.nativeElement.innerHTML;
	const text = (selector: string): string[] =>
		Array.from(
			fixture.nativeElement.querySelectorAll(
				selector
			) as NodeListOf<HTMLElement>
		).map((element) => element.textContent?.trim() ?? '');

	/** Builds the list anew, as coming back from an entity does. */
	const reopen = (): void => {
		fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
	};

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [provideI18nTesting(), provideNoopAnimations()],
		}).compileComponents();

		reopen();
	});

	it('puts the search boxes and the banner of the page on show', () => {
		expect(html()).toContain('Search');
		expect(html()).toContain('A question.');
	});

	it('opens as a table, a column for each template', () => {
		expect(text('th')).toEqual(['Name', 'Actions']);
		expect(text('tbody tr:first-child td')).toEqual([
			'Nirvana',
			'Edit Nirvana',
		]);
	});

	it('lets the table sort by the columns that name a field', () => {
		const headers = fixture.nativeElement.querySelectorAll('th');

		expect(headers[0].getAttribute('aria-sort')).toBe('none');
		expect(headers[0].className).toContain('sortable');
		expect(headers[1].getAttribute('aria-sort')).toBeNull();
		expect(headers[1].getAttribute('tabindex')).toBeNull();
	});

	it('gives the heading and the cells the class of the column', () => {
		const header = fixture.nativeElement.querySelector('th');

		expect(header.className).toContain('wide');
		// The class of the page does not cost the column its sorting.
		expect(header.className).toContain('sortable');
		expect(fixture.nativeElement.querySelector('tbody td').className).toBe(
			'wide'
		);
	});

	it('keeps a heading out of sight where the page asks for it', () => {
		const headers = fixture.nativeElement.querySelectorAll('th');

		expect(headers[1].querySelector('.visually-hidden')?.textContent).toBe(
			'Actions'
		);
	});

	it('marks the rows the page wants marked', () => {
		const rows = fixture.nativeElement.querySelectorAll('tbody tr');

		expect(rows[0].className).toBe('');
		expect(rows[1].className).toBe('is-retired');
	});

	it('shows the cards once the view is turned over', () => {
		fixture.componentInstance.view.setView('cards');
		fixture.detectChanges();

		expect(text('.card')).toEqual(['Nirvana', 'Pixies']);
		expect(fixture.nativeElement.querySelector('table')).toBeNull();
	});

	it('says when there is nothing to show', () => {
		fixture.componentInstance.records = [];
		fixture.detectChanges();

		expect(html()).toContain('Nothing here.');
	});

	it('pages the table, and comes back to the page it was left on', () => {
		fixture.componentInstance.place.table.setPage(1, 1);
		fixture.detectChanges();

		expect(text('tbody .name')).toEqual(['Pixies']);

		reopen();

		expect(text('tbody .name')).toEqual(['Pixies']);
	});

	it('shows the last page when the list has grown shorter, never nothing', () => {
		fixture.componentInstance.place.table.setPage(40, 1);

		reopen();

		expect(text('tbody .name')).toEqual(['Pixies']);
	});

	it('sorts the list by the column that was clicked, and turns it around', () => {
		const header = () => fixture.nativeElement.querySelector('th');

		header().click();
		fixture.detectChanges();

		expect(fixture.componentInstance.place.sort()).toEqual([
			{ field: 'name', order: 1 },
		]);
		expect(header().getAttribute('aria-sort')).toBe('ascending');

		header().click();
		fixture.detectChanges();

		expect(text('tbody .name')).toEqual(['Pixies', 'Nirvana']);
		expect(header().getAttribute('aria-sort')).toBe('descending');
	});

	it('adds a further level when the heading is shift-clicked', () => {
		const header = fixture.nativeElement.querySelector('th');

		header.click();
		header.dispatchEvent(
			new MouseEvent('click', { bubbles: true, shiftKey: true })
		);
		fixture.detectChanges();

		expect(fixture.componentInstance.place.sort()).toEqual([
			{ field: 'name', order: -1 },
		]);
		expect(
			fixture.nativeElement.querySelector('.mc-sort-level')
		).toBeNull();
	});

	it('reads a list sorted anew from its top', () => {
		fixture.componentInstance.place.table.setPage(1, 1);
		fixture.detectChanges();

		fixture.nativeElement.querySelector('th').click();
		fixture.detectChanges();

		expect(fixture.componentInstance.place.table.first()).toBe(0);
	});

	it('takes the sorting up again where it was left', () => {
		fixture.componentInstance.place.setSort([{ field: 'name', order: -1 }]);

		reopen();

		expect(text('tbody .name')).toEqual(['Pixies', 'Nirvana']);
	});

	it('keeps the page it stands on when the sorting is taken up again', () => {
		fixture.componentInstance.place.setSort([{ field: 'name', order: -1 }]);
		fixture.componentInstance.place.table.setPage(1, 1);

		reopen();

		expect(fixture.componentInstance.place.table.first()).toBe(1);
		expect(text('tbody .name')).toEqual(['Nirvana']);
	});

	it('sorts the cards the same way as the table', () => {
		fixture.componentInstance.place.setSort([{ field: 'name', order: -1 }]);
		fixture.componentInstance.view.setView('cards');
		fixture.detectChanges();

		expect(text('.card')).toEqual(['Pixies', 'Nirvana']);
	});
});
