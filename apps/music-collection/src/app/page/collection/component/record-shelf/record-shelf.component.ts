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

import { MediaFormat, ReleaseView } from '../../../../shared/music-ui';
import {
	ShelfDrop,
	ShelfPlay,
	ShelfSpotRef,
	ShelfUnitView,
} from '../../collection.model';

import { RecordShelfPeekComponent } from './record-shelf-peek.component';

interface Spine {
	release: ReleaseView;
	href: string;
	width: number;
	height: number;
	hue: number;
}

interface Compartment {
	key: string;
	label: string;
	spines: Spine[];
	/** The records in it, in the order they stand, by album id. */
	albumIds: string[];
	/** Drawn but with nothing in it; the unit keeps the shape either way. */
	empty: boolean;
	/** The drawn compartment this is, or null on the wall and the overflow. */
	spot: ShelfSpotRef | null;
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
	compartments: Compartment[];
}

const BOX_SET_SIZE = { width: 30, height: 196 };

/**
 * Spine size per format (px), scaled from real media: a vinyl sleeve is the
 * tallest but thinnest, a cassette is short but chunky. A box set is the widest
 * of them all, whether the release is filed as one or only tagged as one.
 */
const SPINE_SIZE: Record<MediaFormat, { width: number; height: number }> = {
	vinyl: { width: 7, height: 190 },
	dvd: { width: 15, height: 116 },
	cd: { width: 11, height: 80 },
	cassette: { width: 17, height: 70 },
	boxset: BOX_SET_SIZE,
	other: { width: 11, height: 100 },
};

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
		this.shelves().map((shelf) => ({
			key: shelf.key,
			name: shelf.name,
			columns: shelf.columns,
			overflow: shelf.overflow,
			albumIds: shelf.compartments.flatMap((group) =>
				group.items.map((release) => release.albumId)
			),
			compartments: shelf.compartments.map((group) => ({
				key: group.key,
				label: group.label,
				empty: !group.items.length,
				spot: group.spot,
				albumIds: group.items.map((release) => release.albumId),
				spines: group.items.map((release) => ({
					release,
					// A spine on the shelf is a copy the collector owns, so
					// pulling it out opens that copy rather than the album.
					href: this.router.serializeUrl(
						this.router.createUrlTree([
							'/collection',
							'copy',
							release.id,
						])
					),
					...(release.boxSet
						? BOX_SET_SIZE
						: SPINE_SIZE[release.format]),
					hue: hueOf(release.title + release.artistName),
				})),
			})),
		}))
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
		inject(DestroyRef).onDestroy(() => {
			listeners.forEach(([type, listener]) =>
				host.removeEventListener(type, listener as EventListener)
			);
			this.clearDrag();
		});
	}

	private readonly onEnter = (event: Event): void => {
		const element = this.spineOf(event.target);
		const release =
			element && this.releasesById().get(element.dataset['id'] ?? '');

		if (element && release) {
			const { x, y } = this.offsetInRoom(element);

			this.peek().show(release, x + element.offsetWidth / 2, y);
		}
	};

	private readonly onLeave = (event: FocusEvent | PointerEvent): void => {
		const from = this.spineOf(event.target);

		if (from && from !== this.spineOf(event.relatedTarget)) {
			this.peek().hide();
		}
	};

	private readonly onClick = (event: MouseEvent): void => {
		const element = this.spineOf(event.target);

		if (
			!element ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}
		event.preventDefault();
		void this.router.navigateByUrl(element.getAttribute('href') ?? '/');
	};

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
		this.peek().hide();
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
			index: this.indexIn(cell, releaseId, event.clientX),
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
	 * spine whose middle is past the pointer, the record itself left out —
	 * it is on its way somewhere else.
	 */
	private indexIn(cell: HTMLElement, releaseId: string, x: number): number {
		const spines = Array.from(
			cell.querySelectorAll<HTMLElement>('.spine')
		).filter((spine) => spine.dataset['id'] !== releaseId);
		const before = spines.findIndex((spine) => {
			const box = spine.getBoundingClientRect();

			return x < box.left + box.width / 2;
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
		return { x, y };
	}

	private spineOf(target: EventTarget | null): HTMLElement | null {
		return target instanceof Element
			? target.closest<HTMLElement>('.spine')
			: null;
	}
}
