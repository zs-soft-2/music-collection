import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import {
	ComponentFixture,
	DeferBlockState,
	TestBed,
} from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { DEFAULT_CUBBY } from '@music-collection/api';

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
		cubby: DEFAULT_CUBBY,
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
		generic: false,
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

/**
 * A screen with no hover, which jsdom has no notion of. Set before the
 * component is built: the shelf asks once and then listens for the answer to
 * change.
 */
function touchScreen(): void {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: (query: string) => ({
			matches: query === '(hover: none)',
			media: query,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
		}),
	});
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

	afterEach(() => Reflect.deleteProperty(window, 'matchMedia'));

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RecordShelfComponent],
			providers: [provideI18nTesting(), provideRouter([])],
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

	it('plans the unit, each compartment as full as it is', () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [filled('a', ['one', 'two']), empty('b')],
			}),
		]);
		const cells = Array.from(
			host.querySelectorAll<HTMLElement>('.plan-cell')
		);

		expect(cells).toHaveLength(2);
		/* Two LPs in a Kallax cubby: barely any of it. */
		expect(Number(cells[0].style.getPropertyValue('--fill'))).toBeCloseTo(
			(2 * 6) / 330
		);
		expect(cells[1].style.getPropertyValue('--fill')).toBe('0');
		expect(cells[1].classList.contains('is-blank')).toBe(true);
	});

	it('leaves the open wall unplanned; there is no furniture to plan', () => {
		const host = render([
			shelf({ key: 'wall', columns: 0, compartments: [filled('a')] }),
		]);

		expect(host.querySelector('.plan')).toBeNull();
	});

	it('pulls a record out on the first tap and opens it on the second', async () => {
		touchScreen();
		fixture = TestBed.createComponent(RecordShelfComponent);

		const host = render([
			shelf({ columns: 2, compartments: [filled('a', ['one'])] }),
		]);
		const blocks = await fixture.getDeferBlocks();

		await blocks[0].render(DeferBlockState.Complete);

		const router = TestBed.inject(Router);
		const went = jest
			.spyOn(router, 'navigateByUrl')
			.mockResolvedValue(true);
		const [spine] = host.querySelectorAll<HTMLElement>('.spine');
		const tap = (): boolean =>
			spine.dispatchEvent(
				new MouseEvent('click', { bubbles: true, cancelable: true })
			);

		tap();

		/* Out of the compartment, with its cover above it — but still on the shelf. */
		expect(spine.classList.contains('is-out')).toBe(true);
		expect(went).not.toHaveBeenCalled();

		tap();

		expect(went).toHaveBeenCalledWith('/collection/copy/one');
		expect(host.querySelector('.spine.is-out')).toBeNull();
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

	describe('what the search found', () => {
		/** The spines of a compartment that has come into view. */
		const spines = async (host: HTMLElement) => {
			const blocks = await fixture.getDeferBlocks();

			await blocks[0].render(DeferBlockState.Complete);

			return Array.from(host.querySelectorAll<HTMLElement>('.spine'));
		};

		it('lights up what was found and dims the rest', async () => {
			const host = render([
				shelf({ compartments: [filled('a', ['one', 'two'])] }),
			]);

			fixture.componentRef.setInput('found', new Set(['two']));
			fixture.componentRef.setInput('turnedTo', 'two');
			fixture.detectChanges();

			const [first, second] = await spines(host);

			expect(host.querySelector('.room.is-seeking')).not.toBeNull();
			expect(first.classList.contains('is-found')).toBe(false);
			expect(second.classList.contains('is-found')).toBe(true);
			expect(second.classList.contains('is-turned-to')).toBe(true);
			expect(host.querySelector('.compartment.has-found')).not.toBeNull();
		});

		it('leaves the shelf alone while nothing is being looked for', async () => {
			const host = render([
				shelf({ compartments: [filled('a', ['one'])] }),
			]);

			await spines(host);

			expect(host.querySelector('.room.is-seeking')).toBeNull();
			expect(host.querySelector('.spine.is-found')).toBeNull();
		});

		it('walks over to the spine of a record it is shown', async () => {
			const host = render([
				shelf({ compartments: [filled('a', ['one', 'two'])] }),
			]);
			const [, second] = await spines(host);
			const walked = jest.fn();

			second.scrollIntoView = walked;
			fixture.componentInstance.reveal('two');

			expect(walked).toHaveBeenCalledWith(
				expect.objectContaining({ block: 'nearest' })
			);
		});

		/*
		 * A compartment the collector has not scrolled to has no spines in
		 * the page at all, so there is nothing of the record itself to walk
		 * over to — only the compartment it stands in.
		 */
		it('walks over to the compartment of one not yet drawn', () => {
			const host = render([
				shelf({ compartments: [filled('a', ['one', 'two'])] }),
			]);
			const cell = host.querySelector<HTMLElement>('.compartment');
			const walked = jest.fn();

			expect(host.querySelector('.spine')).toBeNull();
			if (cell) {
				cell.scrollIntoView = walked;
			}
			fixture.componentInstance.reveal('two');

			expect(walked).toHaveBeenCalled();
		});
	});
});
