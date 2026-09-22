import {
	ComponentFixture,
	DeferBlockState,
	TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ReleaseView } from '../../../../shared/music-ui';
import {
	ShelfCompartmentView,
	ShelfDrop,
	ShelfUnitView,
} from '../../collection.model';

import { RecordShelfComponent } from './record-shelf.component';

function shelf(unit: Partial<ShelfUnitView>): ShelfUnitView {
	return {
		key: 'one',
		name: '',
		columns: 2,
		compartments: [],
		overflow: false,
		...unit,
	};
}

/** Just enough of a record for a spine to be drawn. */
function release(id: string): ReleaseView {
	return {
		id,
		albumId: `album-${id}`,
		releaseId: null,
		title: 'Painkiller',
		artistId: 'artist',
		artistName: 'Judas Priest',
		coverUrl: null,
		format: 'vinyl',
		albumType: 'LP',
		year: 1990,
		styles: [],
		editions: [],
		weight: null,
		boxSet: false,
		pictureDisc: false,
		addedAt: 0,
		labelName: null,
		country: null,
		placement: null,
	};
}

function filled(key: string, ids: string[] = [key]): ShelfCompartmentView {
	return {
		key,
		label: 'VINYL',
		items: ids.map(release),
		spot: { unitId: 'one', row: 1, column: 1 },
	};
}

/** A compartment the unit was drawn with, with nothing in it. */
function empty(key: string): ShelfCompartmentView {
	return { key, label: '', items: [], spot: null };
}

/** A drag event as jsdom can make one: no DataTransfer, so none is used. */
function drag(type: string, clientX = 0): Event {
	const event = new Event(type, { bubbles: true, cancelable: true });

	Object.defineProperty(event, 'clientX', { value: clientX });

	return event;
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
				compartments: [
					filled('a'),
					...['b', 'c', 'd', 'e', 'f'].map(empty),
				],
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
				compartments: [filled('a')],
			}),
		]);

		expect(host.querySelector('.unit.is-wall')).not.toBeNull();
		expect(host.querySelector('.unit-head')).toBeNull();
	});

	it('hands back where a record was let go', async () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [filled('a', ['one', 'two'])],
			}),
		]);

		fixture.componentRef.setInput('placeable', true);
		fixture.detectChanges();

		/* The spines only exist once the compartment has rendered. */
		const blocks = await fixture.getDeferBlocks();
		await blocks[0].render(DeferBlockState.Complete);

		let dropped: ShelfDrop | null = null;
		fixture.componentInstance.filed.subscribe((drop) => (dropped = drop));

		const spines = Array.from(host.querySelectorAll<HTMLElement>('.spine'));
		const cell = host.querySelector<HTMLElement>('.compartment');

		/* jsdom measures everything as zero, so the spines say where they are. */
		spines.forEach((spine, index) => {
			spine.getBoundingClientRect = () =>
				({ left: index * 10, width: 10 }) as DOMRect;
		});

		spines[1].dispatchEvent(drag('dragstart'));
		cell?.dispatchEvent(drag('dragover'));

		expect(cell?.classList.contains('is-drop')).toBe(true);

		/* Let go left of the first spine's middle: in front of it. */
		cell?.dispatchEvent(drag('drop', 2));

		expect(dropped).toEqual({
			releaseId: 'two',
			unitId: 'one',
			row: 1,
			column: 1,
			index: 0,
		});
		expect(host.querySelector('.compartment.is-drop')).toBeNull();
	});

	it('leaves the records alone while the shelf cannot be rearranged', async () => {
		const host = render([
			shelf({ columns: 2, compartments: [filled('a', ['one'])] }),
		]);
		const blocks = await fixture.getDeferBlocks();
		await blocks[0].render(DeferBlockState.Complete);

		let dropped: ShelfDrop | null = null;
		fixture.componentInstance.filed.subscribe((drop) => (dropped = drop));

		const cell = host.querySelector<HTMLElement>('.compartment');

		expect(cell?.dataset['unit']).toBeUndefined();

		host.querySelector<HTMLElement>('.spine')?.dispatchEvent(
			drag('dragstart')
		);
		cell?.dispatchEvent(drag('drop', 0));

		expect(dropped).toBeNull();
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
