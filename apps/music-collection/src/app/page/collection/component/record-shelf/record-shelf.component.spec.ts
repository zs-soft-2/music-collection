import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ShelfUnitView } from '../../collection.model';

import { RecordShelfComponent } from './record-shelf.component';

function shelf(unit: Partial<ShelfUnitView>): ShelfUnitView {
	return {
		key: 'one',
		name: '',
		columns: 2,
		compartments: [],
		blanks: 0,
		overflow: false,
		...unit,
	};
}

describe('RecordShelfComponent', () => {
	let fixture: ComponentFixture<RecordShelfComponent>;

	const render = (shelves: ShelfUnitView[]): HTMLElement => {
		fixture.componentRef.setInput('shelves', shelves);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RecordShelfComponent],
			providers: [provideRouter([])],
		});

		fixture = TestBed.createComponent(RecordShelfComponent);
	});

	it('draws a unit with every compartment it has, filled or not', () => {
		const host = render([
			shelf({
				name: 'Living room',
				columns: 2,
				compartments: [{ key: 'a', label: 'VINYL', items: [] }],
				blanks: 5,
			}),
		]);
		const unit = host.querySelector<HTMLElement>('.unit');

		expect(unit?.style.getPropertyValue('--cols')).toBe('2');
		expect(host.querySelectorAll('.compartment')).toHaveLength(6);
		expect(host.querySelectorAll('.compartment.is-blank')).toHaveLength(5);
		expect(host.querySelector('.unit-name')?.textContent?.trim()).toBe(
			'Living room'
		);
	});

	it('falls back to one open wall when nothing is drawn', () => {
		const host = render([
			shelf({
				key: 'wall',
				columns: 0,
				compartments: [{ key: 'a', label: 'VINYL', items: [] }],
			}),
		]);

		expect(host.querySelector('.unit.is-wall')).not.toBeNull();
		expect(host.querySelector('.unit-head')).toBeNull();
	});

	it('says plainly what the furniture has no room for', () => {
		const host = render([
			shelf({ key: 'overflow', overflow: true, columns: 3 }),
		]);

		expect(host.querySelector('.unit.is-overflow')).not.toBeNull();
		expect(host.querySelector('.unit-name')?.textContent?.trim()).toBe(
			'Off the shelf'
		);
	});
});
