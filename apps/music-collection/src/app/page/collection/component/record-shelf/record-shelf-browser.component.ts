import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	input,
	output,
	signal,
	untracked,
	viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import type { ShelfSide } from '@music-collection/api';

import type { ReleaseView } from '../../../../shared/music-ui';
import type { ShelfDrop, ShelfSpotRef } from '../../collection.model';

/** One record of a compartment, the way the browser walks it. */
export interface BrowsedRecord {
	release: ReleaseView;
	/** The copy it is: where opening it leads. */
	href: string;
	/** The wall it leans on. */
	side: ShelfSide;
	/** The spine's own colour, for a record with no cover to show. */
	hue: number;
	tint: string | null;
}

/** A compartment with something in it, in the order the room reads. */
export interface BrowsedCompartment {
	key: string;
	label: string;
	/** The unit it stands in; empty on the open wall. */
	unitName: string;
	spot: ShelfSpotRef | null;
	/** A tower: the far wall is its top. */
	down: boolean;
	records: BrowsedRecord[];
	/** Where the run leaning on the far wall begins in `records`. */
	rightFrom: number;
}

/** How far a finger has to travel across the cover to turn to the next one. */
const SWIPE_PX = 40;

/**
 * How long a record that was moved has to stay put before the move is
 * written. Walking a record five places down with the keyboard is five
 * presses and one move, not five writes racing each other.
 */
const SETTLE_MS = 600;

/** How long a written move is shown ahead of the shelf coming back with it. */
const CONFIRM_MS = 5000;

/** How long a write that never said it was busy holds back the next one. */
const IN_FLIGHT_MS = 1500;

/** A move put to the shelf, and when it was written; null while it settles. */
interface Move {
	drop: ShelfDrop;
	sentAt: number | null;
}

/** Where a dragged row would be let go: before which row, and on which wall. */
interface DropMark {
	at: number;
	side: ShelfSide;
}

function sameSpot(drop: ShelfDrop, spot: ShelfSpotRef | null): boolean {
	return (
		!!spot &&
		drop.unitId === spot.unitId &&
		drop.row === spot.row &&
		drop.column === spot.column
	);
}

function sameOrder(a: BrowsedCompartment, b: BrowsedCompartment): boolean {
	return (
		a.rightFrom === b.rightFrom &&
		a.records.length === b.records.length &&
		a.records.every(
			(record, at) => record.release.id === b.records[at].release.id
		)
	);
}

/**
 * The compartment as it will stand once a record is moved in it. The move
 * says where the record goes among the others, never where it came from, so
 * putting it to a compartment that already has it there changes nothing —
 * which is how a move the shelf has come back with is told from one it has
 * not.
 */
export function applyDrop(
	compartment: BrowsedCompartment,
	drop: ShelfDrop
): BrowsedCompartment {
	const id = drop.releaseIds[0];
	const moved = compartment.records.find(({ release }) => release.id === id);

	if (!moved) {
		return compartment;
	}

	const others = compartment.records.filter((record) => record !== moved);
	const left = others.filter(({ side }) => side === 'left');
	const right = others.filter(({ side }) => side === 'right');
	const run = drop.side === 'right' ? right : left;

	run.splice(Math.max(0, Math.min(drop.index, run.length)), 0, {
		...moved,
		side: drop.side,
	});

	return {
		...compartment,
		records: [...left, ...right],
		rightFrom: left.length,
	};
}

/**
 * One compartment taken off the shelf and gone through record by record.
 *
 * On the shelf a record is drawn at its own thickness, which is the point of
 * the shelf and the trouble with reading it: a CD is eight pixels wide, and
 * pointing at the one you mean in a row of thirty is fiddly with a mouse and
 * hopeless with a finger. Here the same compartment is laid out as a list in
 * the order it stands, with the cover of the one you are at shown large, and
 * walked with the arrow keys, a swipe or a click — the shelf stays the
 * picture of the room, this is the reading of one cubby.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-record-shelf-browser',
	host: {
		/*
		 * The shelf listens for clicks on its whole host, and a click it
		 * does not recognise puts the armful down — which a click in here
		 * must not do.
		 */
		'(click)': '$event.stopPropagation()',
		/*
		 * The same for a row dragged about in here: a drop the shelf does
		 * not recognise puts the armful down as well.
		 */
		'(dragstart)': '$event.stopPropagation()',
		'(dragover)': '$event.stopPropagation()',
		'(dragleave)': '$event.stopPropagation()',
		'(drop)': '$event.stopPropagation()',
		'(dragend)': '$event.stopPropagation()',
	},
	imports: [...I18N_IMPORTS],
	templateUrl: './record-shelf-browser.component.html',
	styleUrls: ['./record-shelf-browser.component.scss'],
})
export class RecordShelfBrowserComponent {
	/** Every compartment with something in it, in the order the room reads. */
	public readonly compartments = input.required<BrowsedCompartment[]>();
	/** The copies the search found, marked in the list. */
	public readonly found = input<ReadonlySet<string>>(new Set<string>());
	/** The collector may rearrange the shelf; see the shelf's own input. */
	public readonly placeable = input(false);
	/** A move is being written, and the shelf will take no other till then. */
	public readonly busy = input(false);

	/** A record moved within the compartment, the way the shelf files it. */
	public readonly filed = output<ShelfDrop>();

	private readonly router = inject(Router);
	private readonly dialog =
		viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
	private readonly list = viewChild<ElementRef<HTMLElement>>('list');

	/** The compartment being gone through, by key; null while closed. */
	protected readonly key = signal<string | null>(null);
	/**
	 * The record the browser is at, by copy id rather than by place: the
	 * shelf is a live stream, and a record filed somewhere else while the
	 * browser is open must not leave it pointing at its neighbour.
	 */
	private readonly id = signal<string | null>(null);
	/** Where it was last, for when the record it was at has gone. */
	private last = 0;

	protected readonly where = computed(() =>
		this.compartments().findIndex(({ key }) => key === this.key())
	);

	/**
	 * Moves made here and not yet back from the shelf. They are drawn at
	 * once, ahead of the write: the list has to answer the key as it is
	 * pressed, not when the database has.
	 */
	private readonly moves = signal<Move[]>([]);
	/** The last move has stood still long enough to be written. */
	private readonly settled = signal(true);
	/** Ticks when a timer runs out, for the effects that wait on one. */
	private readonly pulse = signal(0);
	/** A move has been written and the shelf has not said it is done yet. */
	private inFlight = false;
	/** The shelf has said it is writing since the last move went out. */
	private sawBusy = false;
	private settleTimer: ReturnType<typeof setTimeout> | undefined;
	private readonly timers = new Set<ReturnType<typeof setTimeout>>();

	protected readonly compartment = computed(() => {
		const base = this.compartments()[this.where()];

		return base
			? this.moves()
					.filter(({ drop }) => sameSpot(drop, base.spot))
					.reduce((drawn, { drop }) => applyDrop(drawn, drop), base)
			: null;
	});

	/**
	 * The open wall and the overflow have no place to give a record, so
	 * only a drawn compartment can be rearranged.
	 */
	protected readonly canArrange = computed(
		() => this.placeable() && !!this.compartment()?.spot
	);

	/** Something moved here is still on its way to the shelf. */
	protected readonly saving = computed(() => this.moves().length > 0);

	/** The row being dragged, by copy id. */
	protected readonly lifted = signal<string | null>(null);
	/** Where it would land if let go now. */
	protected readonly dropMark = signal<DropMark | null>(null);

	protected readonly at = computed(() => {
		const records = this.compartment()?.records ?? [];
		const found = records.findIndex(
			({ release }) => release.id === this.id()
		);

		return found !== -1
			? found
			: Math.max(0, Math.min(this.last, records.length - 1));
	});

	protected readonly current = computed(
		() => this.compartment()?.records[this.at()] ?? null
	);

	/** A run on the far wall as well as the near one: the gap is drawn. */
	protected readonly gapAt = computed(() => {
		const compartment = this.compartment();

		return compartment &&
			compartment.rightFrom > 0 &&
			compartment.rightFrom < compartment.records.length
			? compartment.rightFrom
			: -1;
	});

	/** Where a swipe across the cover started. */
	private swipeFrom: number | null = null;

	public constructor() {
		/*
		 * The compartment emptied out from under the browser — its last
		 * record filed elsewhere — leaves nothing to look at.
		 */
		effect(() => {
			if (this.key() !== null && !this.compartment()) {
				this.close();
			}
		});

		/*
		 * A move the shelf has come back with is let go of; so is one it
		 * never came back with, after a while — refused, or overtaken by
		 * someone else's — rather than being drawn over the shelf for good.
		 */
		effect(() => {
			this.pulse();

			const compartments = this.compartments();
			const moves = this.moves();
			const now = Date.now();
			const kept = moves.filter(({ drop, sentAt }) => {
				if (sentAt === null) {
					return true;
				}

				const base = compartments.find(({ spot }) =>
					sameSpot(drop, spot)
				);

				return (
					!!base &&
					!sameOrder(applyDrop(base, drop), base) &&
					now - sentAt < CONFIRM_MS
				);
			});

			if (kept.length !== moves.length) {
				untracked(() => this.moves.set(kept));
			}
		});

		/*
		 * Writing the moves, one at a time: the shelf takes no move while
		 * another is being written, and one sent then would be lost.
		 */
		effect(() => {
			this.pulse();

			if (this.busy()) {
				this.sawBusy = true;
				return;
			}
			if (this.inFlight && this.sawBusy) {
				this.inFlight = false;
			}
			if (this.inFlight) {
				return;
			}

			const moves = this.moves();
			const next = moves.findIndex(({ sentAt }) => sentAt === null);

			if (next === -1 || (next === moves.length - 1 && !this.settled())) {
				return;
			}
			untracked(() => this.send(next));
		});

		inject(DestroyRef).onDestroy(() => {
			clearTimeout(this.settleTimer);
			this.timers.forEach((timer) => clearTimeout(timer));
		});
	}

	/** Takes one compartment off the shelf, at one of its records. */
	public open(key: string, id: string | null = null): void {
		const compartment = this.compartments().find(
			(candidate) => candidate.key === key
		);

		if (!compartment?.records.length) {
			return;
		}

		this.key.set(key);
		this.last = 0;
		this.id.set(id ?? compartment.records[0].release.id);

		const dialog = this.dialog().nativeElement;

		if (!dialog.open) {
			dialog.showModal?.();
		}
		this.keepInView();
	}

	protected close(): void {
		this.settle();
		this.dialog().nativeElement.close?.();
	}

	protected onClosed(): void {
		this.key.set(null);
		this.id.set(null);
	}

	/** One record along, either way; it stops at the walls. */
	protected step(by: number): void {
		this.goTo(this.at() + by);
	}

	protected goTo(at: number): void {
		const records = this.compartment()?.records ?? [];
		const next = Math.max(0, Math.min(at, records.length - 1));

		if (!records.length) {
			return;
		}
		this.last = next;
		this.id.set(records[next].release.id);
		this.keepInView();
	}

	/** The compartment beside this one, the way the room reads. */
	protected turn(by: number): void {
		const next = this.compartments()[this.where() + by];

		if (next) {
			this.open(next.key);
		}
	}

	protected openCurrent(event?: Event): void {
		const href = this.current()?.href;

		event?.preventDefault();

		if (!href) {
			return;
		}
		this.close();
		void this.router.navigateByUrl(href);
	}

	/**
	 * The record the browser is at, one place along. Over the empty shelf
	 * between the two runs it first changes walls, and only then moves on
	 * — the one step that does not pass a neighbour.
	 */
	protected shift(by: -1 | 1): void {
		const compartment = this.compartment();
		const record = this.current();

		if (!compartment || !record || !this.canArrange()) {
			return;
		}

		const at = this.at();
		const left = compartment.rightFrom;
		const last = compartment.records.length - 1;

		const along = at - left;

		if (record.side === 'left' && by < 0 && at > 0) {
			this.place('left', at - 1);
		} else if (record.side === 'left' && by > 0) {
			/* The last of the near run crosses over to the far wall. */
			this.place(
				at === left - 1 ? 'right' : 'left',
				at === left - 1 ? 0 : at + 1
			);
		} else if (record.side === 'right' && by < 0) {
			/* The first of the far run crosses back to the near wall. */
			this.place(
				along === 0 ? 'left' : 'right',
				along === 0 ? left : along - 1
			);
		} else if (record.side === 'right' && by > 0 && at < last) {
			this.place('right', along + 1);
		}
	}

	/** The record the browser is at, put down against a wall. */
	private place(side: ShelfSide, index: number): void {
		const compartment = this.compartment();
		const id = this.current()?.release.id;

		if (!compartment?.spot || !id) {
			return;
		}

		const drop: ShelfDrop = {
			releaseIds: [id],
			unitId: compartment.spot.unitId,
			row: compartment.spot.row,
			column: compartment.spot.column,
			side,
			index,
		};

		if (sameOrder(applyDrop(compartment, drop), compartment)) {
			return;
		}

		/*
		 * The same record moved again before it was written is the same
		 * move: where it ends up is all the shelf needs to hear.
		 */
		this.moves.update((moves) => {
			const last = moves.at(-1);

			return last?.sentAt === null && last.drop.releaseIds[0] === id
				? [...moves.slice(0, -1), { drop, sentAt: null }]
				: [...moves, { drop, sentAt: null }];
		});
		this.settled.set(false);
		clearTimeout(this.settleTimer);
		this.settleTimer = setTimeout(() => this.settled.set(true), SETTLE_MS);
		this.keepInView();
	}

	/** Whatever was moved is written now, not after the pause. */
	private settle(): void {
		clearTimeout(this.settleTimer);
		this.settled.set(true);
	}

	private send(at: number): void {
		const move = this.moves()[at];

		if (!move) {
			return;
		}
		this.inFlight = true;
		this.sawBusy = false;
		this.later(() => (this.inFlight = false), IN_FLIGHT_MS);
		this.later(() => undefined, CONFIRM_MS + 50);
		this.moves.update((moves) =>
			moves.map((queued, index) =>
				index === at ? { ...queued, sentAt: Date.now() } : queued
			)
		);
		this.filed.emit(move.drop);
	}

	/** Runs something after a while, and wakes the effects up afterwards. */
	private later(then: () => void, ms: number): void {
		const timer = setTimeout(() => {
			this.timers.delete(timer);
			then();
			this.pulse.update((tick) => tick + 1);
		}, ms);

		this.timers.add(timer);
	}

	/*
	 * Dragging a row to its place. The rows are few and drawn in a dialog of
	 * their own, so unlike the shelf the mark is a signal and not a class
	 * set by hand.
	 */

	/**
	 * Where the mark for a dragged row is drawn on row `at`: above it, or —
	 * for the last row of its run, which has no row of its own wall below
	 * it — under it.
	 */
	protected markOf(at: number): 'before' | 'after' | null {
		const mark = this.dropMark();
		const records = this.compartment()?.records ?? [];
		const record = records[at];

		if (!mark || !record || mark.side !== record.side) {
			return null;
		}
		if (mark.at === at) {
			return 'before';
		}
		return mark.at === at + 1 && records[at + 1]?.side !== record.side
			? 'after'
			: null;
	}

	protected onDragStart(event: DragEvent): void {
		const row = (event.target as Element | null)?.closest<HTMLElement>(
			'.row'
		);
		const id = row?.dataset['id'];

		if (!this.canArrange() || !id) {
			event.preventDefault();
			return;
		}
		this.id.set(id);
		this.lifted.set(id);
		event.dataTransfer?.setData('text/plain', id);

		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	protected onDragOver(event: DragEvent): void {
		const compartment = this.compartment();

		if (!this.lifted() || !compartment) {
			return;
		}
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}

		const mark = this.markAt(event, compartment);
		const was = this.dropMark();

		if (was?.at !== mark.at || was?.side !== mark.side) {
			this.dropMark.set(mark);
		}
	}

	protected onDrop(event: DragEvent): void {
		const mark = this.dropMark();
		const compartment = this.compartment();
		const id = this.lifted();

		event.preventDefault();
		this.onDragEnd();

		if (!mark || !compartment || !id) {
			return;
		}

		/* Counted among the others, the way the shelf files a record. */
		const from = compartment.records.findIndex(
			({ release }) => release.id === id
		);
		const among = mark.at - (from !== -1 && mark.at > from ? 1 : 0);
		const left =
			compartment.rightFrom -
			(compartment.records[from]?.side === 'left' ? 1 : 0);

		this.id.set(id);
		this.place(
			mark.side,
			mark.side === 'left'
				? Math.min(among, left)
				: Math.max(0, among - left)
		);
		this.settle();
	}

	protected onDragEnd(): void {
		this.lifted.set(null);
		this.dropMark.set(null);
	}

	/**
	 * Where the pointer would put the row down: before or after the row it
	 * is over, on that row's wall; on the empty shelf between the runs, on
	 * the wall of the half it is in; under the last row, at the end.
	 */
	private markAt(
		event: DragEvent,
		compartment: BrowsedCompartment
	): DropMark {
		const target = event.target as Element | null;
		const row = target?.closest<HTMLElement>('.row, .rows-gap');
		const box = row?.getBoundingClientRect();
		const lower = !!box && event.clientY > box.top + box.height / 2;

		if (row?.classList.contains('rows-gap')) {
			return {
				at: compartment.rightFrom,
				side: lower ? 'right' : 'left',
			};
		}

		const at = Number(row?.dataset['at']);
		const record = compartment.records[at];

		if (!row || !record) {
			return {
				at: compartment.records.length,
				side: compartment.records.at(-1)?.side ?? 'left',
			};
		}
		return { at: lower ? at + 1 : at, side: record.side };
	}

	protected onKey(event: KeyboardEvent): void {
		if (event.metaKey || event.ctrlKey) {
			return;
		}
		/* With Alt held the record goes along, not the browser. */
		if (event.altKey) {
			const by =
				event.key === 'ArrowUp' || event.key === 'ArrowLeft'
					? -1
					: event.key === 'ArrowDown' || event.key === 'ArrowRight'
						? 1
						: 0;

			if (by) {
				event.preventDefault();
				this.shift(by);
			}
			return;
		}

		const moves: Record<string, () => void> = {
			ArrowLeft: () => this.step(-1),
			ArrowUp: () => this.step(-1),
			ArrowRight: () => this.step(1),
			ArrowDown: () => this.step(1),
			Home: () => this.goTo(0),
			End: () => this.goTo(Number.MAX_SAFE_INTEGER),
			PageUp: () => this.turn(-1),
			PageDown: () => this.turn(1),
		};
		const target = event.target as Element | null;

		/* A button or the link answers Enter itself. */
		if (event.key === 'Enter' && !target?.closest('button, a')) {
			this.openCurrent(event);
			return;
		}

		const move = moves[event.key];

		if (move) {
			event.preventDefault();
			move();
		}
	}

	/** A click on a row of the list goes to that record. */
	protected onRowClick(event: MouseEvent): void {
		const at = this.rowAt(event);

		if (at !== null) {
			this.goTo(at);
		}
	}

	/** A double click on a row opens the record it is. */
	protected onRowOpen(event: MouseEvent): void {
		if (this.rowAt(event) !== null) {
			this.openCurrent(event);
		}
	}

	protected onSwipeStart(event: PointerEvent): void {
		this.swipeFrom = event.pointerType === 'mouse' ? null : event.clientX;
	}

	protected onSwipeEnd(event: PointerEvent): void {
		if (this.swipeFrom === null) {
			return;
		}

		const travelled = event.clientX - this.swipeFrom;

		this.swipeFrom = null;

		if (Math.abs(travelled) >= SWIPE_PX) {
			this.step(travelled < 0 ? 1 : -1);
		}
	}

	/** The spine colour a record with no cover is shown in. */
	protected swatch(record: BrowsedRecord): string {
		return record.tint ?? `hsl(${record.hue} 32% 30%)`;
	}

	/** The place of the row an event happened on, or null off the rows. */
	private rowAt(event: Event): number | null {
		const row = (event.target as Element | null)?.closest<HTMLElement>(
			'.row'
		);
		const at = Number(row?.dataset['at']);

		return row && Number.isInteger(at) ? at : null;
	}

	/**
	 * The row of the record the browser is at, scrolled to — once the list
	 * has been drawn with it lit, which is the frame after the change.
	 */
	private keepInView(): void {
		const view = this.dialog().nativeElement.ownerDocument.defaultView;

		view?.requestAnimationFrame?.(() => {
			const list = this.list()?.nativeElement;

			list?.querySelector<HTMLElement>(
				`[data-at="${this.at()}"]`
			)?.scrollIntoView?.({ block: 'nearest' });
			if (
				list &&
				!this.dialog().nativeElement.contains(
					list.ownerDocument.activeElement
				)
			) {
				list.focus({ preventScroll: true });
			}
		});
	}
}
