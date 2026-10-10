import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	ElementRef,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	SHELF_HEIGHT_UNIT_CM,
	ShelfCubby,
	ShelfSide,
} from '@music-collection/api';

import { ReleaseView } from '../../../../shared/music-ui';
import { ShelfWidths } from '../../shelf-layout.setting';
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
	/** The sleeve colour the catalog holds, or null to fall back to `hue`. */
	tint: string | null;
	/** The tint is light enough that the lettering on it has to go dark. */
	pale: boolean;
	/** What it eats of the compartment's length, so boards can be measured. */
	mm: number;
	/** Wide enough to carry its title without spilling over its neighbours. */
	readable: boolean;
	/** The wall of the compartment it leans on; what a drop reads back. */
	side: ShelfSide;
}

/**
 * One drawn run of a compartment, with the gap in it. The spines stand in
 * the order they are drawn; `rightFrom` is where the ones leaning on the far
 * wall begin, and what is between the two runs is the empty shelf the
 * collector left there.
 */
interface Board {
	spines: Spine[];
	rightFrom: number;
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
	boards: Board[];
	/** The records in it, in the order they stand, by album id. */
	albumIds: string[];
	/** How many stand against the near wall: where "put them here" files. */
	leftCount: number;
	/** Drawn but with nothing in it; the unit keeps the shape either way. */
	empty: boolean;
	/** One of the records the search found stands here. */
	found: boolean;
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
	/** One of the records the search found stands in it. */
	found: boolean;
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

/** A sleeve colour the shelf will hand to CSS: `#rrggbb` and nothing else. */
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

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

/** How much shelf a run of records takes, in millimetres. */
function mmOf(spines: readonly Spine[]): number {
	return spines.reduce((sum, spine) => sum + spine.mm, 0);
}

/**
 * Breaks a compartment's copies into the boards they are drawn on, each one
 * a board's worth of shelf. What will not go on a board carries on on the
 * next one — always, even past the length the compartment was measured at:
 * a record is drawn at its own thickness and at nothing else, so a
 * compartment packed fuller than the tape allows (which one filed by hand
 * may well be) is drawn over the runs it actually needs rather than having
 * everything in it squeezed thinner to keep up appearances.
 */
function toBoards(spines: Spine[], cubby: ShelfCubby): Spine[][] {
	const per = Math.min(cubby.length, BOARD_MM);
	const boards: Spine[][] = [[]];
	let used = 0;

	for (const spine of spines) {
		const board = boards[boards.length - 1];

		if (board.length && used + spine.mm > per) {
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
 * The runs a compartment's contents need: what the left-hand records take,
 * plus one where the run leaning on the far wall will not share the last
 * board with them.
 */
function runsFor(boards: Spine[][], right: Spine[], per: number): number {
	const last = boards[boards.length - 1] ?? [];

	return (
		boards.length + (right.length && mmOf(last) + mmOf(right) > per ? 1 : 0)
	);
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
 *
 * The run leaning on the far wall goes on the last board drawn, not on the
 * last one with anything on it: a compartment drawn over three boards has
 * its far wall at the end of the third, wherever the left-hand run gave out.
 *
 * Which is also why the far-hand run may ask for a run of its own: the two
 * share the last board, and where they will not both go on it the
 * compartment carries on rather than the runs being pushed into each other.
 */
function overRuns(boards: Spine[][], runs: number, right: Spine[]): Board[] {
	return Array.from({ length: runs }, (_, at) => {
		const left = boards[at] ?? [];
		const far = at === runs - 1 ? right : [];

		return { spines: [...left, ...far], rightFrom: left.length };
	});
}

/**
 * How full a compartment is, 0 to 1. Measured against what the tape says
 * rather than against the fullest compartment there is, so a plan of a
 * half-empty unit reads as a half-empty unit. A compartment the collector
 * packed tighter than the tape allows for tops out at full.
 */
function fillOf(spines: Spine[], cubby: ShelfCubby): number {
	return Math.min(1, mmOf(spines) / Math.max(1, cubby.length));
}

/** A value safe to put inside a quoted attribute selector. */
function quote(value: string): string {
	return value.replace(/["\\]/g, '\\$&');
}

/** The wall a drawn record leans on; one drawn before there were two, the left. */
function sideOfSpine(spine: HTMLElement): ShelfSide {
	return spine.dataset['side'] === 'right' ? 'right' : 'left';
}

/** One wall of a compartment, as the button that files an armful against it. */
interface WallButton {
	side: ShelfSide;
	/** What the wall is called, for the label and the screen reader. */
	label: string;
	icon: string;
}

/**
 * The two walls a compartment is filled from. A shelf's are its left and
 * right; a tower's are its floor and its ceiling, which is the same two runs
 * stood on end — so they are named and drawn as what the collector is
 * looking at rather than as what the data calls them.
 */
const WALLS: WallButton[] = [
	{
		side: 'left',
		label: 'ui.recordShelf.put-left',
		icon: 'pi-arrow-down-left',
	},
	{
		side: 'right',
		label: 'ui.recordShelf.put-right',
		icon: 'pi-arrow-down-right',
	},
];

const TOWER_WALLS: WallButton[] = [
	{ side: 'left', label: 'ui.recordShelf.put-bottom', icon: 'pi-arrow-down' },
	{ side: 'right', label: 'ui.recordShelf.put-top', icon: 'pi-arrow-up' },
];

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
 * Whether a sleeve colour is light enough that white lettering would be
 * lost on it. Perceived brightness rather than the plain average: the eye
 * reads a yellow sleeve as far lighter than a blue one of the same numbers.
 */
function isPale(color: string): boolean {
	const value = parseInt(color.slice(1), 16);
	const red = (value >> 16) & 0xff;
	const green = (value >> 8) & 0xff;
	const blue = value & 0xff;

	return (red * 299 + green * 587 + blue * 114) / 1000 > 150;
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
	 * How wide the collector measured their own copies, in millimetres. It is
	 * the same measurement the records were filed by, so what is drawn and
	 * what was reckoned to fit are never two different shelves.
	 */
	public readonly widths = input<ShelfWidths>({});
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
	/**
	 * The copies the search found, which the shelf lights up while the rest
	 * of it goes quiet. Empty for a shelf nobody is searching — then nothing
	 * is dimmed, because there is nothing to pick out.
	 */
	public readonly found = input<ReadonlySet<string>>(new Set<string>());
	/**
	 * The one of them the shelf is turned to: lit brightest, and walked over
	 * to by `reveal`.
	 */
	public readonly turnedTo = input<string | null>(null);
	/**
	 * The collector is rearranging rather than looking. The room is laid out
	 * as one long row of compartments — every unit beside the last, every
	 * compartment beside the one before it — so a record never has to be
	 * hauled diagonally across a wall of furniture to reach its place: it
	 * only ever travels sideways, and the row scrolls itself as a record is
	 * carried to its edge.
	 */
	public readonly arranging = input(false);

	/** A record was let go over a compartment of a drawn unit. */
	public readonly filed = output<ShelfDrop>();
	/** A compartment, or a whole unit, asked to be put on. */
	public readonly putOn = output<ShelfPlay>();

	private readonly router = inject(Router);
	private readonly peek = viewChild.required(RecordShelfPeekComponent);
	private readonly room = viewChild.required<ElementRef<HTMLElement>>('room');
	/** The floor the furniture stands on, and what scrolls while arranging. */
	private readonly floor =
		viewChild.required<ElementRef<HTMLElement>>('floor');

	/**
	 * The records the collector has picked out to move together, by copy id.
	 *
	 * A signal and not a class on the spine, unlike the hover and the drag:
	 * picking is a click, not a gesture that fires with every pixel of mouse
	 * movement, so the shelf can afford to redraw for it — and in exchange
	 * the picking survives the shelf being drawn again under it.
	 */
	protected readonly picked = signal<ReadonlySet<string>>(new Set());

	/**
	 * What is picked, in the order it stands on the shelf rather than the
	 * order it was clicked. An armful put down keeps the order it came off
	 * the shelf in, which is the only order the collector can see.
	 */
	protected readonly carried = computed(() => {
		const picked = this.picked();

		return picked.size
			? [...this.releasesById().keys()].filter((id) => picked.has(id))
			: [];
	});

	protected readonly units = computed<Unit[]>(() =>
		this.shelves().map((shelf) => {
			const down = shelf.cubby.stance === 'down';
			const board = boardOf(shelf.cubby);
			/* One board's worth of shelf, and how many of them the cubby is. */
			const per = Math.min(shelf.cubby.length, BOARD_MM);
			const fits = Math.max(1, Math.ceil(shelf.cubby.length / BOARD_MM));
			const filled = shelf.compartments.map((group) => {
				const spines = group.items.map((release, at) => {
					const size = shelfSizeOf(release, this.widths());
					const along = size.thickness * PX_PER_MM;
					const across = size.height * PX_PER_HEIGHT_UNIT;

					// Drawn straight into a CSS custom property, so a value
					// of any other shape is left off rather than passed on:
					// one bad string takes the whole gradient down and
					// leaves a see-through record standing in the cubby.
					const tint = HEX_COLOR.test(release.coverColor ?? '')
						? release.coverColor
						: null;

					return {
						release,
						side: (at < group.rightFrom
							? 'left'
							: 'right') as ShelfSide,
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
						tint,
						pale: !!tint && isPale(tint),
					};
				});

				/*
				 * Only the left-hand run is wrapped onto boards: the one
				 * leaning on the far wall is drawn at the end of the
				 * compartment, which is the end of its last board.
				 */
				const boards = toBoards(
					spines.slice(0, group.rightFrom),
					shelf.cubby
				);
				const right = spines.slice(group.rightFrom);

				return {
					group,
					spines,
					boards,
					right,
					needs: runsFor(boards, right, per),
				};
			});
			/*
			 * What the fullest compartment needs, which they all are drawn
			 * to — but never more runs than the cubby itself has. A
			 * compartment the collector packed fuller than the tape allows
			 * runs on by itself: made the measure of the unit it would add
			 * an empty run to every other compartment in the furniture, and
			 * the whole thing would be drawn twice as tall for the sake of
			 * three records that did not fit in one of its cubbies.
			 */
			const runs = Math.min(
				fits,
				Math.max(1, ...filled.map(({ needs }) => needs))
			);
			/* What the deepest compartment is drawn over, overfull or not. */
			const most = Math.max(runs, ...filled.map(({ needs }) => needs));
			/* A tower's runs stand side by side; a shelf's stack up. */
			const wide = down ? most : 1;

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
				compartments: filled.map(
					({ group, spines, boards, right, needs }) => ({
						key: group.key,
						label: group.label,
						leftCount: group.rightFrom,
						empty: !spines.length,
						found: spines.some((spine) =>
							this.found().has(spine.release.id)
						),
						spot: group.spot,
						albumIds: group.items.map((release) => release.albumId),
						spines,
						boards: overRuns(boards, Math.max(runs, needs), right),
					})
				),
				plan: planned
					? filled.map(({ group, spines }) => ({
							key: group.key,
							label: group.label,
							fill: fillOf(spines, shelf.cubby),
							found: spines.some((spine) =>
								this.found().has(spine.release.id)
							),
						}))
					: [],
			};
		})
	);

	/**
	 * The compartment each record is drawn in. What `reveal` falls back to:
	 * a compartment that has not come into view yet has no spines in the
	 * page to scroll to, but the compartment itself is always there.
	 */
	private readonly cellByRecord = computed(
		() =>
			new Map(
				this.shelves().flatMap((shelf) =>
					shelf.compartments.flatMap((group) =>
						group.items.map(
							(release) => [release.id, group.key] as const
						)
					)
				)
			)
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

		const put =
			target instanceof Element
				? target.closest<HTMLElement>('.label-put')
				: null;

		/* A wall's button: the armful walked over rather than dragged. */
		if (put) {
			event.preventDefault();
			this.putPicked(
				this.compartmentOf(put),
				put.dataset['side'] === 'right' ? 'right' : 'left'
			);
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
			/* And lets go of whatever was picked up; the room is clear. */
			this.unpick();
			return;
		}
		if (event.button !== 0 || event.altKey) {
			return;
		}
		/*
		 * Picking records out to carry together. On a shelf that can be
		 * rearranged this takes the modified click off the browser — no new
		 * tab, no system selection — because filing twenty records one drag
		 * at a time is the thing that makes rearranging a chore. On a shelf
		 * that cannot be rearranged the click is left alone.
		 */
		if (this.placeable() && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			this.pick(element);
			return;
		}
		if (this.placeable() && event.shiftKey) {
			event.preventDefault();
			this.pickTo(element);
			return;
		}
		/*
		 * Arranging is not looking. With the furniture pulled out into a
		 * row the collector is filing records, not reading sleeves, so the
		 * plain click picks one up rather than opening it — which is also
		 * the only way a finger can gather an armful, there being no
		 * modifier key on a phone.
		 */
		if (this.placeable() && this.arranging()) {
			event.preventDefault();
			this.pick(element);
			return;
		}
		if (event.metaKey || event.ctrlKey || event.shiftKey) {
			return;
		}
		/* A plain click on the shelf is a look, so the armful is put down. */
		this.unpick();
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
		const cell = this.host.querySelector<HTMLElement>(
			`.compartment[data-cell="${quote(key)}"]`
		);

		cell?.scrollIntoView?.({
			block: 'nearest',
			behavior: this.matches('(prefers-reduced-motion: reduce)')
				? 'auto'
				: 'smooth',
		});
	}

	/**
	 * Walks the shelf over to one record: the spine itself where the
	 * compartment has been drawn, and the compartment where it has not come
	 * into view yet and has no spines in the page. Called rather than bound,
	 * because walking over to the record you are already standing at is the
	 * point of asking twice.
	 */
	public reveal(id: string): void {
		const spine = this.host.querySelector<HTMLElement>(
			`.spine[data-id="${quote(id)}"]`
		);

		if (spine) {
			spine.scrollIntoView?.({
				block: 'nearest',
				inline: 'center',
				behavior: this.matches('(prefers-reduced-motion: reduce)')
					? 'auto'
					: 'smooth',
			});
			return;
		}

		const cell = this.cellByRecord().get(id);

		if (cell) {
			this.walkTo(cell);
		}
	}

	/*
	 * Picking records out. A collector rearranging a shelf moves a run of
	 * records, not one record twenty times over, so the shelf lets them be
	 * gathered first and carried in one go — by drag, or by the button on
	 * the compartment they are to stand in.
	 */

	/** The spine a shift-click measures its run from. */
	private anchor: string | null = null;

	/** One record in or out of the armful. */
	private pick(spine: HTMLElement): void {
		const id = spine.dataset['id'];

		if (!id) {
			return;
		}

		const picked = new Set(this.picked());

		if (!picked.delete(id)) {
			picked.add(id);
			this.anchor = id;
		}
		this.putBack();
		this.picked.set(picked);
	}

	/**
	 * Everything from the last record picked out to this one, the way the
	 * compartment reads. Only within one compartment: a run across the room
	 * would be a hundred records nobody asked for, and the gesture a
	 * collector actually makes is "this shelf-ful, from here to here".
	 */
	private pickTo(spine: HTMLElement): void {
		const cell = spine.closest<HTMLElement>('.compartment');
		const spines = cell
			? Array.from(cell.querySelectorAll<HTMLElement>('.spine'))
			: [];
		const to = spines.indexOf(spine);
		const from = spines.findIndex(
			(stood) => stood.dataset['id'] === this.anchor
		);

		if (from === -1 || to === -1) {
			this.pick(spine);
			return;
		}

		const picked = new Set(this.picked());

		spines
			.slice(Math.min(from, to), Math.max(from, to) + 1)
			.forEach((stood) => {
				const id = stood.dataset['id'];

				if (id) {
					picked.add(id);
				}
			});
		this.putBack();
		this.picked.set(picked);
	}

	protected readonly walls = WALLS;
	protected readonly towerWalls = TOWER_WALLS;

	/** The armful put down; nothing is carried any more. */
	protected unpick(): void {
		if (this.picked().size) {
			this.picked.set(new Set());
		}
		this.anchor = null;
	}

	/**
	 * The armful filed against one wall of a compartment without being
	 * dragged there: the one gesture that works the same on a phone, over a
	 * long distance, and with forty records in hand.
	 *
	 * They go at the inner end of that wall's run — up against what is
	 * already leaning on it, growing towards the middle of the compartment —
	 * which is both where a collector putting a stack down puts it and what
	 * leaves the other wall alone: the boxes standing at the far end of a
	 * half-empty cubby are the whole reason that run exists.
	 *
	 * The left-hand run is numbered from the left, so its inner end is its
	 * length (`data-left`, how long it is drawn); the right-hand run is
	 * numbered from the right, so its inner end is where it starts. The
	 * filing clamps anything past the end of a run to the end, so neither
	 * needs the spines read.
	 */
	private putPicked(cell: HTMLElement | null, side: ShelfSide): void {
		const releaseIds = this.carried();
		const unitId = cell?.dataset['unit'];
		const row = Number(cell?.dataset['row']);
		const column = Number(cell?.dataset['column']);

		if (!releaseIds.length || !unitId || !row || !column) {
			return;
		}
		this.putBack();
		this.unpick();
		this.filed.emit({
			releaseIds,
			unitId,
			row,
			column,
			side,
			index: side === 'right' ? 0 : Number(cell?.dataset['left']) || 0,
		});
	}

	/*
	 * Rearranging by hand. Like the hover, this is delegated and touches the
	 * DOM directly: a drag crossing forty compartments must not mark forty
	 * views dirty, so the drop target is highlighted by a class rather than
	 * by a binding.
	 */

	/** The records being carried, while they are in the air. */
	private dragging: string[] = [];
	/** The compartment the pointer is over, highlighted. */
	private over: HTMLElement | null = null;

	private readonly onDragStart = (event: DragEvent): void => {
		const element = this.spineOf(event.target);
		const id = element?.dataset['id'];

		if (!this.placeable() || !element || !id) {
			return;
		}
		/*
		 * A record picked out carries the whole armful with it; one that is
		 * not picked out is a fresh gesture, and what was gathered before it
		 * is put back down.
		 */
		if (!this.picked().has(id)) {
			this.unpick();
		}

		this.dragging = this.picked().has(id) ? this.carried() : [id];
		this.putBack();
		this.dragging.forEach((carried) =>
			this.spineFor(carried)?.classList.add('is-lifted')
		);
		event.dataTransfer?.setData('text/plain', this.dragging.join(' '));

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

		if (!this.dragging.length) {
			return;
		}
		/*
		 * Held near one end of the row, the row walks that way by itself —
		 * the far compartment comes to the record rather than the record
		 * being hauled off the edge of the screen to reach it.
		 */
		this.rollTowards(event.clientX);

		if (!cell) {
			return;
		}
		/* Only a prevented dragover makes a drop possible at all. */
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		if (this.over !== cell) {
			this.clearDropMark();
			cell.classList.add('is-drop');
			this.over = cell;
		}
		/*
		 * Which half of the compartment the record would go in. Drawn while
		 * the record is still in the air, because the two halves are not
		 * drawn on the furniture: without it the only way to find out which
		 * wall you are over is to let go and see.
		 */
		const side = this.placeIn(
			cell,
			new Set(this.dragging),
			event.clientX,
			event.clientY
		).side;

		cell.classList.toggle('is-drop-left', side === 'left');
		cell.classList.toggle('is-drop-right', side === 'right');
	};

	private readonly onDragLeave = (event: DragEvent): void => {
		const cell = this.compartmentOf(event.target);

		if (
			cell &&
			cell === this.over &&
			!cell.contains(event.relatedTarget as Node)
		) {
			this.clearDropMark();
			this.over = null;
		}
	};

	private readonly onDrop = (event: DragEvent): void => {
		const cell = this.compartmentOf(event.target);
		const releaseIds = this.dragging;

		this.clearDrag();
		this.unpick();

		if (!releaseIds.length || !cell) {
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
			releaseIds,
			unitId,
			row,
			column,
			...this.placeIn(
				cell,
				new Set(releaseIds),
				event.clientX,
				event.clientY
			),
		});
	};

	private readonly onDragEnd = (): void => this.clearDrag();

	private clearDropMark(): void {
		this.over?.classList.remove('is-drop', 'is-drop-left', 'is-drop-right');
	}

	private clearDrag(): void {
		document.removeEventListener('dragover', swallow);
		document.removeEventListener('drop', swallow);
		this.clearDropMark();
		this.over = null;
		this.dragging = [];
		this.stopRolling();
		this.host
			.querySelectorAll('.spine.is-lifted')
			.forEach((spine) => spine.classList.remove('is-lifted'));
	}

	/*
	 * The row walking itself along under a record held at its edge. A drag
	 * is the one gesture during which the collector cannot scroll: both
	 * hands are busy holding the record. The nearer the edge the faster it
	 * goes, so the far end of a long row is reachable without the pointer
	 * ever leaving the window.
	 */

	/** How hard the row is being pushed, -1 to 1; 0 for not at all. */
	private roll = 0;
	/** The frame the rolling is waiting on, if it is rolling. */
	private rolling: number | null = null;

	/** The most a row walks in one frame, held at the very edge. */
	private static readonly ROLL_PX = 22;
	/** How far in from the edge the pull starts being felt. */
	private static readonly ROLL_REACH = 110;

	private rollTowards(x: number): void {
		const floor = this.floor().nativeElement;

		/* A room that is not a row has nowhere to walk to. */
		if (floor.scrollWidth <= floor.clientWidth) {
			this.roll = 0;
			return;
		}

		const box = floor.getBoundingClientRect();
		const reach = Math.min(
			RecordShelfComponent.ROLL_REACH,
			box.width / 4 || 0
		);
		const near = x - box.left;
		const far = box.right - x;

		this.roll =
			near < reach
				? -(1 - Math.max(0, near) / reach)
				: far < reach
					? 1 - Math.max(0, far) / reach
					: 0;

		if (this.roll && this.rolling === null) {
			this.keepRolling();
		}
	}

	private keepRolling(): void {
		const view = this.host.ownerDocument.defaultView;
		const floor = this.floor().nativeElement;
		const step = (): void => {
			if (!this.roll || !this.dragging.length) {
				this.rolling = null;
				return;
			}
			floor.scrollLeft += this.roll * RecordShelfComponent.ROLL_PX;
			this.rolling = view?.requestAnimationFrame(step) ?? null;
		};

		this.rolling = view?.requestAnimationFrame(step) ?? null;
	}

	private stopRolling(): void {
		if (this.rolling !== null) {
			this.host.ownerDocument.defaultView?.cancelAnimationFrame(
				this.rolling
			);
		}
		this.rolling = null;
		this.roll = 0;
	}

	/**
	 * Where the records were let go: which wall of the compartment, and
	 * where among the records already leaning on that wall. What is being
	 * carried is left out of the reckoning — it is on its way somewhere
	 * else, even where that is back into the compartment it came from.
	 *
	 * A long compartment is drawn over several boards, so "not reached yet"
	 * is read the way the compartment is: a spine on a later run of shelf is
	 * always further along, and only among the spines of the run the pointer
	 * is over does its place along that run decide. A tower runs the other
	 * way, bottom to top.
	 *
	 * Which wall is `sideUnder`: a run of shelf is two places to put a
	 * record down, split at the middle of the empty shelf between its two
	 * rows. Only where the record goes *along* that row is read off the
	 * spines, so how high above them it was let go decides nothing — in a
	 * compartment measured for LPs a CD case stands a third of the way up
	 * the board, and the air over it is still shelf.
	 */
	private placeIn(
		cell: HTMLElement,
		carried: ReadonlySet<string>,
		x: number,
		y: number
	): { side: ShelfSide; index: number } {
		const down = cell.dataset['stance'] === 'down';
		const boards = Array.from(cell.querySelectorAll<HTMLElement>('.board'));
		const spines = Array.from(
			cell.querySelectorAll<HTMLElement>('.spine')
		).filter((spine) => !carried.has(spine.dataset['id'] ?? ''));
		const over = this.runUnder(boards, down, x, y);
		const runOf = (spine: HTMLElement): number => {
			const board = spine.closest<HTMLElement>('.board');

			return board ? boards.indexOf(board) : over;
		};
		const side = this.sideUnder(
			boards[over],
			spines.filter((spine) => runOf(spine) === over),
			down,
			x,
			y
		);
		const run = spines.filter((spine) => sideOfSpine(spine) === side);
		/* Where among that run's records the pointer is. */
		const before = run.findIndex((spine) => {
			const on = runOf(spine);

			/* On a run of shelf the pointer has not got to yet. */
			if (on > over) {
				return true;
			}
			/* On one it is already past. */
			if (on < over) {
				return false;
			}

			const box = spine.getBoundingClientRect();

			return down
				? y > box.top + box.height / 2
				: x < box.left + box.width / 2;
		});

		return { side, index: before === -1 ? run.length : before };
	}

	/**
	 * The run of shelf the pointer is over. A compartment too long for one
	 * board is drawn over several, and which of them a record was let go on
	 * is the board's business and not the spines': a CD standing in an LP
	 * compartment is a third of the board tall, and the air above it is
	 * still its own run of shelf — as is the compartment's label above the
	 * first board, which is where a record carried in from outside the
	 * compartment arrives.
	 *
	 * Let go past the last run, that run answers: there is no shelf beyond
	 * it to belong to.
	 */
	private runUnder(
		boards: readonly HTMLElement[],
		down: boolean,
		x: number,
		y: number
	): number {
		const at = boards.findIndex((board) => {
			const box = board.getBoundingClientRect();

			return down ? x <= box.right : y <= box.bottom;
		});

		return at === -1 ? boards.length - 1 : at;
	}

	/**
	 * The wall a record let go on a run of shelf leans on. A run is two
	 * places to put a record down, not one, and the line between them is
	 * the middle of the shelf standing empty between its two rows — so it
	 * moves as the rows grow: an empty run is halved, a run with a long
	 * left-hand row is mostly left-hand, and one packed solid is split
	 * where its two rows meet.
	 *
	 * An empty compartment is halved too, which is what lets a right-hand
	 * row be started at all.
	 */
	private sideUnder(
		board: HTMLElement | undefined,
		spines: readonly HTMLElement[],
		down: boolean,
		x: number,
		y: number
	): ShelfSide {
		const run = board?.getBoundingClientRect();

		if (!run) {
			return 'left';
		}

		const leaning = (side: ShelfSide) =>
			spines.filter((spine) => sideOfSpine(spine) === side);
		const left = leaning('left').at(-1)?.getBoundingClientRect();
		const right = leaning('right').at(0)?.getBoundingClientRect();
		/* The empty shelf: from the end of one row to the start of the other. */
		const from = down
			? (left?.top ?? run.bottom)
			: (left?.right ?? run.left);
		const to = down
			? (right?.bottom ?? run.top)
			: (right?.left ?? run.right);
		const half = (from + to) / 2;

		return (down ? y < half : x > half) ? 'right' : 'left';
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

	/** The spine standing for one copy, where it is drawn at all. */
	private spineFor(id: string): HTMLElement | null {
		return this.host.querySelector<HTMLElement>(
			`.spine[data-id="${quote(id)}"]`
		);
	}
}
