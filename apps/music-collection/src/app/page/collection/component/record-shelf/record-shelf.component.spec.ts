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
function release(id: string, coverColor: string | null = null): ReleaseView {
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
		coverColor,
		generic: false,
		placement: null,
	};
}

function filled(
	key: string,
	ids: string[] = [key],
	/** Where the run leaning on the right wall begins; none, by default. */
	rightFrom = ids.length
): ShelfCompartmentView {
	return {
		key,
		label: 'VINYL',
		items: ids.map((id) => release(id)),
		spot: { unitId: 'one', row: 1, column: 1 },
		rightFrom,
	};
}

/** A compartment the unit was drawn with, with nothing in it. */
function empty(key: string): ShelfCompartmentView {
	return { key, label: '', items: [], spot: null, rightFrom: 0 };
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

/** Picking a record out to be carried: the modified click that does it. */
function pick(): MouseEvent {
	return new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		ctrlKey: true,
	});
}

/** A drag event as jsdom can make one: no DataTransfer, so none is used. */
function drag(type: string, clientX = 0, clientY = 0): Event {
	const event = new Event(type, { bubbles: true, cancelable: true });

	Object.defineProperty(event, 'clientX', { value: clientX });
	Object.defineProperty(event, 'clientY', { value: clientY });

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

	/*
	 * The colour goes into a CSS custom property, so the test is as much
	 * about what is kept out of it: a string CSS cannot paint with takes the
	 * whole gradient down and leaves a see-through record in the cubby.
	 */
	it('draws a spine in the sleeve colour the catalog holds', async () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [
					{
						key: 'a',
						label: 'VINYL',
						spot: { unitId: 'one', row: 1, column: 1 },
						rightFrom: 3,
						items: [
							release('dark', '#1a3c8c'),
							release('pale', '#f2e6c9'),
							release('junk', 'crimson'),
						],
					},
				],
			}),
		]);

		const blocks = await fixture.getDeferBlocks();
		await blocks[0].render(DeferBlockState.Complete);

		const [dark, pale, junk] = Array.from(
			host.querySelectorAll<HTMLElement>('.spine')
		);

		expect(dark.style.getPropertyValue('--tint')).toBe('#1a3c8c');
		expect(dark.classList.contains('is-tinted')).toBe(true);
		expect(dark.classList.contains('is-pale')).toBe(false);

		/* Pale enough that white lettering on it would be gone. */
		expect(pale.classList.contains('is-pale')).toBe(true);

		expect(junk.style.getPropertyValue('--tint')).toBe('');
		expect(junk.classList.contains('is-tinted')).toBe(false);
		/* And it still gets the shelf's own made-up colour. */
		expect(junk.style.getPropertyValue('--hue')).not.toBe('');
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
				({
					left: index * 10,
					right: index * 10 + 10,
					width: 10,
				}) as DOMRect;
		});

		spines[1].dispatchEvent(drag('dragstart'));
		cell?.dispatchEvent(drag('dragover'));

		expect(cell?.classList.contains('is-drop')).toBe(true);

		/* Let go left of the first spine's middle: in front of it. */
		cell?.dispatchEvent(drag('drop', 2));

		expect(dropped).toEqual({
			releaseIds: ['two'],
			unitId: 'one',
			row: 1,
			column: 1,
			side: 'left',
			index: 0,
		});
		expect(host.querySelector('.compartment.is-drop')).toBeNull();
	});

	it('leans a record on the right wall when it is let go out there', async () => {
		const host = render([
			shelf({ columns: 2, compartments: [filled('a', ['one'])] }),
		]);

		fixture.componentRef.setInput('placeable', true);
		fixture.detectChanges();

		const blocks = await fixture.getDeferBlocks();
		await blocks[0].render(DeferBlockState.Complete);

		let dropped: ShelfDrop | null = null;
		fixture.componentInstance.filed.subscribe((drop) => (dropped = drop));

		const spine = host.querySelector<HTMLElement>('.spine');
		const board = host.querySelector<HTMLElement>('.board');
		const cell = host.querySelector<HTMLElement>('.compartment');

		/* One record at the near end of a board a hundred wide. */
		spine!.getBoundingClientRect = () =>
			({ left: 0, right: 10, width: 10 }) as DOMRect;
		board!.getBoundingClientRect = () =>
			({ left: 0, right: 100, width: 100 }) as DOMRect;

		spine!.dispatchEvent(drag('dragstart'));
		/* Let go past the middle of the shelf standing empty beyond it. */
		cell?.dispatchEvent(drag('drop', 80));

		expect(dropped).toEqual({
			releaseIds: ['one'],
			unitId: 'one',
			row: 1,
			column: 1,
			side: 'right',
			index: 0,
		});
	});

	/*
	 * A compartment is drawn as tall as it was measured, so anything shorter
	 * than it stands with empty air above it — a CD case in an LP cubby has
	 * two thirds of the board over its head, and the compartment's label
	 * another strip above that. Where a record is let go along the shelf is
	 * the only thing that may decide where it goes; how high above the
	 * records it was let go may decide nothing.
	 */
	describe('a record let go above the records standing there', () => {
		/** A CD case at the near end of a compartment an LP tall. */
		async function cdInATallCubby(): Promise<{
			host: HTMLElement;
			cell: HTMLElement | null;
			spines: HTMLElement[];
		}> {
			const host = render([
				shelf({
					columns: 2,
					compartments: [filled('a', ['one', 'two'])],
				}),
			]);

			fixture.componentRef.setInput('placeable', true);
			fixture.detectChanges();

			const blocks = await fixture.getDeferBlocks();
			await blocks[0].render(DeferBlockState.Complete);

			const spines = Array.from(
				host.querySelectorAll<HTMLElement>('.spine')
			);
			const board = host.querySelector<HTMLElement>('.board');

			spines.forEach((spine, index) => {
				spine.getBoundingClientRect = () =>
					({
						left: index * 10,
						right: index * 10 + 10,
						width: 10,
						top: 200,
						bottom: 240,
						height: 40,
					}) as DOMRect;
			});
			board!.getBoundingClientRect = () =>
				({
					left: 0,
					right: 100,
					width: 100,
					top: 0,
					bottom: 240,
					height: 240,
				}) as DOMRect;

			return {
				host,
				cell: host.querySelector<HTMLElement>('.compartment'),
				spines,
			};
		}

		it('leans on the right wall when it is let go out by it', async () => {
			const { cell, spines } = await cdInATallCubby();

			let dropped: ShelfDrop | null = null;
			fixture.componentInstance.filed.subscribe(
				(drop) => (dropped = drop)
			);

			spines[1].dispatchEvent(drag('dragstart'));
			/* Out by the far wall, high above the case standing there. */
			cell?.dispatchEvent(drag('drop', 80, 40));

			expect(dropped).toEqual({
				releaseIds: ['two'],
				unitId: 'one',
				row: 1,
				column: 1,
				side: 'right',
				index: 0,
			});
		});

		it('marks the wall it is being held over, before it is let go', async () => {
			const { cell, spines } = await cdInATallCubby();

			spines[1].dispatchEvent(drag('dragstart'));
			cell?.dispatchEvent(drag('dragover', 80, 40));

			expect(cell?.classList.contains('is-drop-right')).toBe(true);
			expect(cell?.classList.contains('is-drop-left')).toBe(false);

			/* Carried back over the near wall, the mark follows it. */
			cell?.dispatchEvent(drag('dragover', 2, 40));

			expect(cell?.classList.contains('is-drop-left')).toBe(true);
			expect(cell?.classList.contains('is-drop-right')).toBe(false);
		});

		it('still goes in front of the first record let go there', async () => {
			const { cell, spines } = await cdInATallCubby();

			let dropped: ShelfDrop | null = null;
			fixture.componentInstance.filed.subscribe(
				(drop) => (dropped = drop)
			);

			spines[1].dispatchEvent(drag('dragstart'));
			/* At the near wall, just as high up. */
			cell?.dispatchEvent(drag('drop', 2, 40));

			expect(dropped).toEqual({
				releaseIds: ['two'],
				unitId: 'one',
				row: 1,
				column: 1,
				side: 'left',
				index: 0,
			});
		});
	});

	/*
	 * The two halves of a compartment are not drawn on the furniture, so the
	 * line between them is the middle of the shelf its rows left empty: it
	 * moves as they grow, and a compartment with a record against each wall
	 * is split between them.
	 */
	it('splits a compartment down the middle of the shelf left empty', async () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [
					filled('a', ['one', 'two'], 1),
					{
						...filled('b', ['three']),
						spot: { unitId: 'one', row: 1, column: 2 },
					},
				],
			}),
		]);

		fixture.componentRef.setInput('placeable', true);
		fixture.detectChanges();

		const blocks = await fixture.getDeferBlocks();
		await Promise.all(
			blocks.map((block) => block.render(DeferBlockState.Complete))
		);

		let dropped: ShelfDrop | null = null;
		fixture.componentInstance.filed.subscribe((drop) => (dropped = drop));

		const spines = Array.from(host.querySelectorAll<HTMLElement>('.spine'));
		const cell = host.querySelector<HTMLElement>('.compartment');
		const board = host.querySelector<HTMLElement>('.board');
		const standing = (left: number) => () =>
			({
				left,
				right: left + 10,
				width: 10,
				top: 200,
				bottom: 240,
				height: 40,
			}) as DOMRect;

		/* One record against each wall of a board a hundred wide. */
		spines[0].getBoundingClientRect = standing(0);
		spines[1].getBoundingClientRect = standing(90);
		board!.getBoundingClientRect = () =>
			({
				left: 0,
				right: 100,
				width: 100,
				top: 0,
				bottom: 240,
				height: 240,
			}) as DOMRect;

		/* Let go in the near half of the gap: behind the left-hand row. */
		spines[2].dispatchEvent(drag('dragstart'));
		cell?.dispatchEvent(drag('drop', 30, 220));

		expect(dropped).toEqual({
			releaseIds: ['three'],
			unitId: 'one',
			row: 1,
			column: 1,
			side: 'left',
			index: 1,
		});

		/* And in the far half: behind the record against the right wall. */
		spines[2].dispatchEvent(drag('dragstart'));
		cell?.dispatchEvent(drag('drop', 70, 220));

		expect(dropped).toEqual({
			releaseIds: ['three'],
			unitId: 'one',
			row: 1,
			column: 1,
			side: 'right',
			index: 0,
		});
	});

	it('carries every record picked out, in the order they stand', async () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [filled('a', ['one', 'two', 'three'])],
			}),
		]);

		fixture.componentRef.setInput('placeable', true);
		fixture.detectChanges();

		const blocks = await fixture.getDeferBlocks();
		await blocks[0].render(DeferBlockState.Complete);

		let dropped: ShelfDrop | null = null;
		fixture.componentInstance.filed.subscribe((drop) => (dropped = drop));

		const spines = Array.from(host.querySelectorAll<HTMLElement>('.spine'));
		const cell = host.querySelector<HTMLElement>('.compartment');

		/* Picked out the other way round; they travel in shelf order. */
		spines[2].dispatchEvent(pick());
		spines[0].dispatchEvent(pick());
		fixture.detectChanges();

		expect(host.querySelectorAll('.spine.is-picked')).toHaveLength(2);
		expect(host.querySelector('.hands-count')?.textContent).toBe('2');

		spines.forEach((spine, index) => {
			spine.getBoundingClientRect = () =>
				({
					left: index * 10,
					right: index * 10 + 10,
					width: 10,
				}) as DOMRect;
		});

		spines[0].dispatchEvent(drag('dragstart'));
		cell?.dispatchEvent(drag('drop', 2));

		expect(dropped).toEqual({
			releaseIds: ['one', 'three'],
			unitId: 'one',
			row: 1,
			column: 1,
			side: 'left',
			index: 0,
		});
		/* Put down is put down: nothing is left in hand. */
		fixture.detectChanges();
		expect(host.querySelector('.hands')).toBeNull();
	});

	it('files the armful into the compartment that asks for it', async () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [
					filled('a', ['one', 'two']),
					{
						...filled('b', ['three']),
						spot: { unitId: 'one', row: 1, column: 2 },
					},
				],
			}),
		]);

		fixture.componentRef.setInput('placeable', true);
		fixture.detectChanges();

		const blocks = await fixture.getDeferBlocks();
		await Promise.all(
			blocks.map((block) => block.render(DeferBlockState.Complete))
		);

		let dropped: ShelfDrop | null = null;
		fixture.componentInstance.filed.subscribe((drop) => (dropped = drop));

		host.querySelector<HTMLElement>('.spine')?.dispatchEvent(pick());
		fixture.detectChanges();

		const second = host.querySelectorAll<HTMLElement>('.compartment')[1];

		second.querySelector<HTMLElement>('.label-put')?.click();

		/* The end of the near-hand run of the compartment it was put in. */
		expect(dropped).toEqual({
			releaseIds: ['one'],
			unitId: 'one',
			row: 1,
			column: 2,
			side: 'left',
			index: 1,
		});
	});

	/*
	 * A compartment has two walls, and a tap says nothing about which one is
	 * meant — so each is offered its own button. It is the only way to lean
	 * a record on the far wall on a phone, which has no drag at all.
	 */
	it('leans the armful on the far wall when that wall asks for it', async () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [
					filled('a', ['one', 'two']),
					{
						...filled('b', ['three']),
						spot: { unitId: 'one', row: 1, column: 2 },
					},
				],
			}),
		]);

		fixture.componentRef.setInput('placeable', true);
		fixture.detectChanges();

		const blocks = await fixture.getDeferBlocks();
		await Promise.all(
			blocks.map((block) => block.render(DeferBlockState.Complete))
		);

		let dropped: ShelfDrop | null = null;
		fixture.componentInstance.filed.subscribe((drop) => (dropped = drop));

		host.querySelector<HTMLElement>('.spine')?.dispatchEvent(pick());
		fixture.detectChanges();

		const second = host.querySelectorAll<HTMLElement>('.compartment')[1];
		const walls = second.querySelectorAll<HTMLElement>('.label-put');

		expect(walls).toHaveLength(2);
		walls[1].click();

		/*
		 * The inner end of the right-hand run: what already leans on that
		 * wall stays against it, and the run grows towards the middle.
		 */
		expect(dropped).toEqual({
			releaseIds: ['one'],
			unitId: 'one',
			row: 1,
			column: 2,
			side: 'right',
			index: 0,
		});
	});

	it('takes a plain click as picking a record up while arranging', async () => {
		const host = render([
			shelf({ columns: 2, compartments: [filled('a', ['one', 'two'])] }),
		]);

		fixture.componentRef.setInput('placeable', true);
		fixture.componentRef.setInput('arranging', true);
		fixture.detectChanges();

		const blocks = await fixture.getDeferBlocks();
		await blocks[0].render(DeferBlockState.Complete);

		const spine = host.querySelector<HTMLElement>('.spine');

		spine?.click();
		fixture.detectChanges();

		expect(host.querySelectorAll('.spine.is-picked')).toHaveLength(1);

		/* And the click after it puts that record back down. */
		spine?.click();
		fixture.detectChanges();

		expect(host.querySelector('.spine.is-picked')).toBeNull();
	});

	it('lays the furniture out in a row while it is being arranged', () => {
		const host = render([
			shelf({ columns: 2, compartments: [filled('a', ['one'])] }),
		]);

		expect(host.querySelector('.room.is-arranging')).toBeNull();

		fixture.componentRef.setInput('arranging', true);
		fixture.detectChanges();

		expect(host.querySelector('.room.is-arranging')).not.toBeNull();
	});

	it("draws the gap between a compartment's two runs", async () => {
		const host = render([
			shelf({
				columns: 2,
				compartments: [filled('a', ['one', 'two', 'far'], 2)],
			}),
		]);
		const blocks = await fixture.getDeferBlocks();

		await blocks[0].render(DeferBlockState.Complete);

		const drawn = Array.from(
			host.querySelectorAll<HTMLElement>('.board > *')
		).map((node) => node.className.split(' ')[0]);

		expect(drawn).toEqual(['spine', 'spine', 'board-space', 'spine']);
		expect(
			host.querySelectorAll<HTMLElement>('.spine')[2].dataset['side']
		).toBe('right');
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
