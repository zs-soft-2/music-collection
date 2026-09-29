import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	ElementRef,
	inject,
	input,
	output,
	viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { SHELF_HEIGHT_UNIT_CM, ShelfCubby } from '@music-collection/api';

import { ReleaseView } from '../../../../shared/music-ui';
import {
	ShelfDrop,
	ShelfPlay,
	ShelfSpotRef,
	ShelfUnitView,
} from '../../collection.model';
import { shelfSizeOf } from '../../shelf-placement';

import { RecordShelfPeekComponent } from './record-shelf-peek.component';

interface Spine {
	release: ReleaseView;
	href: string;
	width: number;
	height: number;
	hue: number;
	/** What it eats of the compartment's length, so boards can be measured. */
	mm: number;
	/** Wide enough to carry its title without spilling over its neighbours. */
	readable: boolean;
}

interface Compartment {
	key: string;
	label: string;
	spines: Spine[];
	/**
	 * The compartment broken into boards it can be drawn on. A shelf three
	 * metres long is still one compartment; drawn as one run it would be a
	 * smear no one could read, so it is wrapped — and the boards stay inside
	 * the compartment's one frame and its one label, which is what says they
	 * belong together.
	 */
	boards: Spine[][];
	/** The records in it, in the order they stand, by album id. */
	albumIds: string[];
	/** Drawn but with nothing in it; the unit keeps the shape either way. */
	empty: boolean;
	/** The drawn compartment this is, or null on the wall and the overflow. */
	spot: ShelfSpotRef | null;
}

/**
 * One compartment on the little plan of a unit. A narrow screen draws the
 * compartments one under the other, so the plan is the only place the
 * furniture is still seen whole — and tapping a cell walks over to it.
 */
interface PlanCell {
	key: string;
	/** How full the compartment is, 0 to 1: what the plan colours in. */
	fill: number;
	/** What stands in it, for the cell's tooltip. */
	label: string;
}

/** One drawn unit standing in the room, with its compartments filled. */
interface Unit {
	key: string;
	name: string;
	/** Everything standing in the unit, compartment by compartment. */
	albumIds: string[];
	/** Compartments per row; 0 for the open wall, which fills the width. */
	columns: number;
	overflow: boolean;
	/** The copies lie stacked rather than standing: a tower, not a shelf. */
	down: boolean;
	/** One board of a compartment, in pixels. */
	board: { width: number; height: number };
	/**
	 * How wide the compartment is drawn, boards and all. A tower's boards
	 * stand side by side, so a long one is a wide column; a shelf's stack up
	 * and stay one board wide.
	 */
	width: number;
	compartments: Compartment[];
	/** The unit at a glance; empty where there is no furniture to plan. */
	plan: PlanCell[];
}

/**
 * The drawing's scale: one, for both ways round. A compartment 32 cm long
 * and 32 cm tall has to come out a square, so the height cannot be drawn on
 * a scale of its own however much roomier that would make an LP spine look.
 * A millimetre is a little under a pixel, which puts a Kallax cubby at the
 * 260-odd pixels a column has always been.
 */
const PX_PER_MM = 0.8;

/** The same scale, for a height counted in four-centimetre units. */
const PX_PER_HEIGHT_UNIT = SHELF_HEIGHT_UNIT_CM * 10 * PX_PER_MM;

/**
 * A spine narrower than this has no room for a letter: the text would spill
 * over its neighbours and the compartment would read as noise rather than as
 * records. Such a spine is drawn bare, and the cover still comes up on
 * hover.
 */
const READABLE_PX = 6;

/**
 * How much of a compartment goes on one drawn board: a Kallax width, which
 * is the run a collector's eye is used to. Anything longer wraps onto the
 * next board of the same compartment.
 */
const BOARD_MM = 330;

/** The gap between two boards of the same compartment, as the styles set it. */
const BOARD_GAP = 8;

/** One board of a compartment this size, in pixels. */
function boardOf(cubby: ShelfCubby): { width: number; height: number } {
	const along = Math.min(cubby.length, BOARD_MM) * PX_PER_MM;
	const across = cubby.height * PX_PER_HEIGHT_UNIT;

	return cubby.stance === 'down'
		? { width: across, height: along }
		: { width: along, height: across };
}

/** The most boards a compartment this long is ever drawn over. */
function runsOf(cubby: ShelfCubby): number {
	return Math.max(1, Math.ceil(cubby.length / BOARD_MM));
}

/**
 * Breaks a compartment's copies into the boards they are drawn on, each one
 * a board's worth of shelf, and never more of them than the compartment is
 * long: a compartment the collector squeezed fuller than the tape allows —
 * which one filed by hand may well be — does not grow a board it has not
 * got. Its last board takes the remainder and the spines shrink into it,
 * which is exactly what an overstuffed cubby looks like in a real room.
 */
function toBoards(spines: Spine[], cubby: ShelfCubby): Spine[][] {
	const per = Math.min(cubby.length, BOARD_MM);
	const most = runsOf(cubby);
	const boards: Spine[][] = [[]];
	let used = 0;

	for (const spine of spines) {
		const board = boards[boards.length - 1];

		if (board.length && used + spine.mm > per && boards.length < most) {
			boards.push([spine]);
			used = spine.mm;
			continue;
		}
		board.push(spine);
		used += spine.mm;
	}

	return boards;
}

/**
 * The same compartment drawn over a set number of runs, the trailing ones
 * bare.
 *
 * Compartments are cells of one grid, so they share a height whether they
 * like it or not. Left to themselves a half-empty one would be drawn short
 * and stand over a hole the height of its neighbour's second run. So the
 * fullest compartment of a unit says how many runs the unit is drawn over,
 * and the emptier ones show the rest of their shelf standing empty — which
 * is what it is.
 *
 * It is the fullest one and not the cubby's full length on purpose: a three
 * metre compartment holding eight CDs is drawn as the one run they stand on,
 * not as nine runs of darkness.
 */
function overRuns(boards: Spine[][], runs: number): Spine[][] {
	return Array.from({ length: runs }, (_, at) => boards[at] ?? []);
}

/**
 * How full a compartment is, 0 to 1. Measured against what the tape says
 * rather than against the fullest compartment there is, so a plan of a
 * half-empty unit reads as a half-empty unit. A compartment the collector
 * packed tighter than the tape allows for tops out at full.
 */
function fillOf(spines: Spine[], cubby: ShelfCubby): number {
	const used = spines.reduce((sum, spine) => sum + spine.mm, 0);

	return Math.min(1, used / Math.max(1, cubby.length));
}

/** Takes the drop away from the browser, which would follow the link. */
const swallow = (event: Event): void => event.preventDefault();

/** A stable pseudo-random hue per release, so spines are not all identical. */
function hueOf(text: string): number {
	let hash = 0;

	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) | 0;
	}
	return Math.abs(hash) % 360;
}

/**
 * Collection shelf — releases stand spine-out in square, Kallax-like
 * compartments, in the units the collector drew in their profile. Hovering or
 * focusing a spine pulls it out and shows the cover.
 *
 * Built for hundreds of spines:
 * - compartments render when they approach the viewport (`@defer`), and
 *   off-screen ones skip rendering (`content-visibility`);
 * - pointer / focus / click listeners are delegated native listeners (not
 *   template bindings), so moving the mouse never marks the spines dirty;
 * - one shared cover preview in its own small view instead of one per spine;
 * - plain `href`s instead of a `RouterLink` per spine.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-record-shelf',
	templateUrl: './record-shelf.component.html',
	styleUrls: ['./record-shelf.component.scss'],
	imports: [...I18N_IMPORTS, RecordShelfPeekComponent],
})
export class RecordShelfComponent {
	public readonly shelves = input.required<ShelfUnitView[]>();
	/**
	 * The collector may rearrange this shelf by hand. Off while a filter is
	 * on: half a collection is no shelf to file records into.
	 */
	public readonly placeable = input(false);
	/**
	 * A record can be put on at all. Without the outside players there is
	 * nothing to play it on, and a shelf that offered to would only
	 * disappoint.
	 */
	public readonly playable = input(false);

	/** A record was let go over a compartment of a drawn unit. */
	public readonly filed = output<ShelfDrop>();
	/** A compartment, or a whole unit, asked to be put on. */
	public readonly putOn = output<ShelfPlay>();

	private readonly router = inject(Router);
	private readonly peek = viewChild.required(RecordShelfPeekComponent);
	private readonly room = viewChild.required<ElementRef<HTMLElement>>('room');

	protected readonly units = computed<Unit[]>(() =>
		this.shelves().map((shelf) => {
			const down = shelf.cubby.stance === 'down';
			const board = boardOf(shelf.cubby);
			const filled = shelf.compartments.map((group) => {
				const spines = group.items.map((release) => {
					const size = shelfSizeOf(release);
					const along = size.thickness * PX_PER_MM;
					const across = size.height * PX_PER_HEIGHT_UNIT;

					return {
						release,
						// A spine on the shelf is a copy the collector
						// owns, so pulling it out opens that copy rather
						// than the album.
						href: this.router.serializeUrl(
							this.router.createUrlTree([
								'/collection',
								'copy',
								release.id,
							])
						),
						width: down ? across : along,
						height: down ? along : across,
						mm: size.thickness,
						readable: along >= READABLE_PX,
						hue: hueOf(release.title + release.artistName),
					};
				});

				return { group, spines, boards: toBoards(spines, shelf.cubby) };
			});
			/* What the fullest compartment needs, which they all are drawn to. */
			const runs = Math.max(
				1,
				...filled.map(({ boards }) => boards.length)
			);
			/* A tower's runs stand side by side; a shelf's stack up. */
			const wide = down ? runs : 1;

			const planned = shelf.columns && !shelf.overflow;

			return {
				key: shelf.key,
				name: shelf.name,
				columns: shelf.columns,
				overflow: shelf.overflow,
				down,
				board,
				width: board.width * wide + (wide - 1) * BOARD_GAP,
				albumIds: shelf.compartments.flatMap((group) =>
					group.items.map((release) => release.albumId)
				),
				compartments: filled.map(({ group, spines, boards }) => ({
					key: group.key,
					label: group.label,
					empty: !spines.length,
					spot: group.spot,
					albumIds: group.items.map((release) => release.albumId),
					spines,
					boards: overRuns(boards, runs),
				})),
				plan: planned
					? filled.map(({ group, spines }) => ({
							key: group.key,
							label: group.label,
							fill: fillOf(spines, shelf.cubby),
						}))
					: [],
			};
		})
	);

	private readonly releasesById = computed(
		() =>
			new Map(
				this.shelves().flatMap((shelf) =>
					shelf.compartments.flatMap((group) =>
						group.items.map(
							(release) => [release.id, release] as const
						)
					)
				)
			)
	);

	private readonly host: HTMLElement = inject(ElementRef).nativeElement;

	/**
	 * A screen with no hover: a phone or a tablet. The cover cannot be
	 * brought up by moving a finger over a spine, so on one of these the tap
	 * does it, and the tap after that opens the record.
	 */
	private coarse = false;
	/** The spine a tap has pulled out, while it is out. */
	private out: HTMLElement | null = null;

	public constructor() {
		const host = this.host;
		const listeners: [string, (event: never) => void][] = [
			['pointerover', this.onEnter],
			['focusin', this.onEnter],
			['pointerout', this.onLeave],
			['focusout', this.onLeave],
			['click', this.onClick],
			['dragstart', this.onDragStart],
			['dragover', this.onDragOver],
			['dragleave', this.onDragLeave],
			['drop', this.onDrop],
			['dragend', this.onDragEnd],
		];

		listeners.forEach(([type, listener]) =>
			host.addEventListener(type, listener as EventListener)
		);

		/*
		 * Watched rather than read once: a tablet with a keyboard and mouse
		 * attached stops being a touch screen halfway through a session, and
		 * the shelf has to stop asking for two taps when it does.
		 */
		const hover = this.media('(hover: none)');
		const onHoverChange = (): void => {
			this.coarse = hover?.matches ?? false;
			this.putBack();
		};

		this.coarse = hover?.matches ?? false;
		hover?.addEventListener('change', onHoverChange);
		inject(DestroyRef).onDestroy(() => {
			listeners.forEach(([type, listener]) =>
				host.removeEventListener(type, listener as EventListener)
			);
			hover?.removeEventListener('change', onHoverChange);
			this.clearDrag();
		});
	}

	/**
	 * What the browser says about the screen. Nothing, where there is no
	 * browser to ask — on the server, and under a test runner, where the
	 * shelf is drawn the way a screen with a pointer draws it.
	 */
	private media(query: string): MediaQueryList | null {
		const view = this.host.ownerDocument.defaultView;

		return view?.matchMedia ? view.matchMedia(query) : null;
	}

	private matches(query: string): boolean {
		return this.media(query)?.matches ?? false;
	}

	private readonly onEnter = (event: Event): void => {
		/* A touch screen has no hover; there the tap pulls the record out. */
		if (this.coarse && event.type === 'pointerover') {
			return;
		}

		const element = this.spineOf(event.target);

		if (element) {
			this.pullOut(element);
		}
	};

	private readonly onLeave = (event: FocusEvent | PointerEvent): void => {
		/*
		 * A finger lifted off a spine is a `pointerout`, so left alone this
		 * would put the record back the instant it was tapped out.
		 */
		if (this.coarse && event.type === 'pointerout') {
			return;
		}

		const from = this.spineOf(event.target);

		if (from && from !== this.spineOf(event.relatedTarget)) {
			this.putBack();
		}
	};

	private readonly onClick = (event: MouseEvent): void => {
		const target = event.target;
		const opened =
			target instanceof Element
				? target.closest<HTMLElement>('.peek-open')
				: null;

		/* The button on the cover: the record that is pulled out, opened. */
		if (opened) {
			event.preventDefault();
			this.open(opened.getAttribute('href'));
			return;
		}

		const cell =
			target instanceof Element
				? target.closest<HTMLElement>('.plan-cell')
				: null;

		if (cell) {
			this.walkTo(cell.dataset['cell'] ?? '');
			return;
		}

		const element = this.spineOf(target);

		if (!element) {
			/* A tap anywhere else on the shelf puts the record back. */
			if (this.coarse) {
				this.putBack();
			}
			return;
		}
		if (
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}
		/*
		 * On a touch screen a record is pulled out first and opened second:
		 * one tap brings up the cover, the tap after it — or the button on
		 * that cover — opens the copy. A record nobody can hover over would
		 * otherwise be one nobody can look at without leaving the shelf.
		 */
		if (this.coarse && this.out?.dataset['id'] !== element.dataset['id']) {
			event.preventDefault();
			this.pullOut(element);
			return;
		}
		event.preventDefault();
		this.open(element.getAttribute('href'));
	};

	/** The cover above the spine, wherever the compartment has scrolled to. */
	private pullOut(element: HTMLElement): void {
		const release = this.releasesById().get(element.dataset['id'] ?? '');

		if (!release) {
			return;
		}

		const { x, y } = this.offsetInRoom(element);
		const box = element.getBoundingClientRect();
		const view = this.host.ownerDocument.defaultView;
		const screen = view?.innerHeight ?? 0;

		/*
		 * With a pointer the spine is lifted by `:hover`; a tap has nothing
		 * of the kind, so the one that is out is marked. Like the drag, it
		 * is a class rather than a binding: lifting one spine must not mark
		 * the other hundreds dirty.
		 */
		if (this.coarse) {
			this.out?.classList.remove('is-out');
			element.classList.add('is-out');
			this.out = element;
		}
		this.peek().show({
			release,
			href: element.getAttribute('href') ?? '',
			x: x + element.offsetWidth / 2,
			y,
			/* The other edge, for a card with no screen left to hang above. */
			under: y + element.offsetHeight,
			room: { above: box.top, below: screen - box.bottom },
			within: this.room().nativeElement.clientWidth,
		});
	}

	/** The record back in its compartment, and the cover gone with it. */
	private putBack(): void {
		this.out?.classList.remove('is-out');
		this.out = null;
		this.peek().hide();
	}

	private open(href: string | null): void {
		this.putBack();
		void this.router.navigateByUrl(href || '/');
	}

	/**
	 * Walking over to a compartment the plan was tapped on. On a narrow
	 * screen the compartments are drawn one under the other, so the plan in
	 * the header is the only place the unit is still seen whole — and this
	 * is what makes it more than a picture.
	 */
	private walkTo(key: string): void {
		const quoted = key.replace(/["\\]/g, '\\$&');
		const cell = this.host.querySelector<HTMLElement>(
			`.compartment[data-cell="${quoted}"]`
		);

		cell?.scrollIntoView?.({
			block: 'nearest',
			behavior: this.matches('(prefers-reduced-motion: reduce)')
				? 'auto'
				: 'smooth',
		});
	}

	/*
	 * Rearranging by hand. Like the hover, this is delegated and touches the
	 * DOM directly: a drag crossing forty compartments must not mark forty
	 * views dirty, so the drop target is highlighted by a class rather than
	 * by a binding.
	 */

	/** The record being dragged, while it is in the air. */
	private dragging: string | null = null;
	/** The compartment the pointer is over, highlighted. */
	private over: HTMLElement | null = null;

	private readonly onDragStart = (event: DragEvent): void => {
		const element = this.spineOf(event.target);
		const id = element?.dataset['id'];

		if (!this.placeable() || !element || !id) {
			return;
		}
		this.dragging = id;
		this.putBack();
		element.classList.add('is-lifted');
		event.dataTransfer?.setData('text/plain', id);

		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
		/*
		 * A spine is a link. Let go anywhere but a compartment, some
		 * browsers take that as "open this address" and the collector
		 * loses the page they were arranging — so while a record is in
		 * the air, the whole document swallows the drop.
		 */
		document.addEventListener('dragover', swallow);
		document.addEventListener('drop', swallow);
	};

	private readonly onDragOver = (event: DragEvent): void => {
		const cell = this.compartmentOf(event.target);

		if (!this.dragging || !cell) {
			return;
		}
		/* Only a prevented dragover makes a drop possible at all. */
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		if (this.over !== cell) {
			this.over?.classList.remove('is-drop');
			cell.classList.add('is-drop');
			this.over = cell;
		}
	};

	private readonly onDragLeave = (event: DragEvent): void => {
		const cell = this.compartmentOf(event.target);

		if (
			cell &&
			cell === this.over &&
			!cell.contains(event.relatedTarget as Node)
		) {
			cell.classList.remove('is-drop');
			this.over = null;
		}
	};

	private readonly onDrop = (event: DragEvent): void => {
		const cell = this.compartmentOf(event.target);
		const releaseId = this.dragging;

		this.clearDrag();

		if (!releaseId || !cell) {
			return;
		}
		event.preventDefault();

		const unitId = cell.dataset['unit'];
		const row = Number(cell.dataset['row']);
		const column = Number(cell.dataset['column']);

		if (!unitId || !row || !column) {
			return;
		}
		this.filed.emit({
			releaseId,
			unitId,
			row,
			column,
			index: this.indexIn(cell, releaseId, event.clientX, event.clientY),
		});
	};

	private readonly onDragEnd = (): void => this.clearDrag();

	private clearDrag(): void {
		document.removeEventListener('dragover', swallow);
		document.removeEventListener('drop', swallow);
		this.over?.classList.remove('is-drop');
		this.over = null;
		this.dragging = null;
		this.host
			.querySelector('.spine.is-lifted')
			?.classList.remove('is-lifted');
	}

	/**
	 * Where along the compartment the record was let go: before the first
	 * spine the pointer has not reached yet, the record itself left out — it
	 * is on its way somewhere else.
	 *
	 * A long compartment is drawn over several boards, so "not reached yet"
	 * is read the way the compartment is: a spine on a later board is always
	 * further along, and only within one board does the pointer's place along
	 * it decide. A tower runs the other way, bottom to top.
	 */
	private indexIn(
		cell: HTMLElement,
		releaseId: string,
		x: number,
		y: number
	): number {
		const down = cell.dataset['stance'] === 'down';
		const spines = Array.from(
			cell.querySelectorAll<HTMLElement>('.spine')
		).filter((spine) => spine.dataset['id'] !== releaseId);
		const before = spines.findIndex((spine) => {
			const box = spine.getBoundingClientRect();

			/* On a board the pointer has not got to yet. */
			if (down ? box.right < x : box.top > y) {
				return true;
			}
			if (down ? box.left > x : box.bottom < y) {
				return false;
			}
			return down
				? y > box.top + box.height / 2
				: x < box.left + box.width / 2;
		});

		return before === -1 ? spines.length : before;
	}

	/** The drawn compartment under the pointer; the wall has none. */
	private compartmentOf(target: EventTarget | null): HTMLElement | null {
		return target instanceof Element
			? target.closest<HTMLElement>('.compartment[data-unit]')
			: null;
	}

	/**
	 * Resting spine position relative to .room — the one positioned ancestor,
	 * so a spine in any unit lands in the same coordinates as the preview.
	 * offset* ignores the hover lift transform, but is relative to the
	 * offsetParent — and the compartments' `content-visibility` makes each one
	 * an offsetParent, so the chain is summed up to .room.
	 */
	private offsetInRoom(element: HTMLElement): { x: number; y: number } {
		const room = this.room().nativeElement;
		let x = 0;
		let y = 0;

		for (
			let node: HTMLElement | null = element;
			node && node !== room;
			node = node.offsetParent as HTMLElement | null
		) {
			x += node.offsetLeft;
			y += node.offsetTop;
		}
		/*
		 * A compartment too long for a narrow screen is walked along
		 * sideways, and offsetLeft is blind to that: it says where the spine
		 * was laid out, not where the scroll has since carried it.
		 */
		for (
			let node: HTMLElement | null = element.parentElement;
			node && node !== room;
			node = node.parentElement
		) {
			x -= node.scrollLeft;
			y -= node.scrollTop;
		}
		return { x, y };
	}

	private spineOf(target: EventTarget | null): HTMLElement | null {
		return target instanceof Element
			? target.closest<HTMLElement>('.spine')
			: null;
	}
}
