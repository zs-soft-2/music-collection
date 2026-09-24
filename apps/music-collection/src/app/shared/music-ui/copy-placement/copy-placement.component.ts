import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	afterNextRender,
	computed,
	effect,
	input,
	linkedSignal,
	output,
	viewChild,
} from '@angular/core';
import {
	CollectionItemPlacement,
	MAX_SHELF_POSITION,
	ShelfUnitLayout,
	nextPosition,
	placementInLayout,
	spotKey,
	unitSpots,
} from '@music-collection/api';

import { FormatBadgeComponent } from '../format-badge/format-badge.component';
import { ReleaseView } from '@music-collection/ui/music-view';

/** A compartment as the picker draws it: where it is, and what is already in it. */
interface SpotCell {
	key: string;
	row: number;
	column: number;
	label: string;
	/** Copies the collector has filed here by hand. */
	filed: number;
	chosen: boolean;
}

/**
 * Modal to file a copy into the drawn shelf: which unit, which compartment
 * of it, and how far along that compartment the record stands.
 *
 * The compartment is picked off a drawing of the unit rather than out of a
 * list, because that is how the collector sees the furniture in the room.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-copy-placement',
	imports: [...I18N_IMPORTS, FormatBadgeComponent],
	templateUrl: './copy-placement.component.html',
	styleUrls: ['./copy-placement.component.scss'],
})
export class CopyPlacementComponent {
	public readonly albumTitle = input.required<string>();
	public readonly copy = input.required<ReleaseView>();
	/** The furniture the collector drew in their profile. */
	public readonly units = input.required<readonly ShelfUnitLayout[]>();
	/** Where the collector's other copies stand, so a compartment can say so. */
	public readonly filed = input<readonly CollectionItemPlacement[]>([]);
	public readonly busy = input(false);
	public readonly error = input<string | null>(null);

	/** The place picked, or `null` to leave the filing to the shelf again. */
	public readonly placed = output<CollectionItemPlacement | null>();
	/** Closed by the button, Escape or the page. */
	public readonly closed = output<void>();

	protected readonly maxPosition = MAX_SHELF_POSITION;

	/** Where this copy already stands, as far as the drawn furniture allows. */
	protected readonly standing = computed(() =>
		placementInLayout(this.copy().placement, this.units())
	);

	protected readonly unitId = linkedSignal<string>(
		() => this.standing()?.unitId ?? this.units()[0]?.id ?? ''
	);

	/** Picking another unit clears the compartment: it belonged to the old one. */
	protected readonly spot = linkedSignal<
		string,
		{ row: number; column: number } | null
	>({
		source: this.unitId,
		computation: (unitId) => {
			const standing = this.standing();

			return standing && standing.unitId === unitId
				? { row: standing.row, column: standing.column }
				: null;
		},
	});

	/**
	 * Where along the compartment the record goes: where it already stands,
	 * or behind whatever is filed there.
	 */
	protected readonly position = linkedSignal<
		{ unitId: string; spot: { row: number; column: number } | null },
		number
	>({
		source: () => ({ unitId: this.unitId(), spot: this.spot() }),
		computation: ({ unitId, spot }) => {
			const standing = this.standing();

			if (!spot) {
				return 1;
			}
			if (
				standing &&
				standing.unitId === unitId &&
				standing.row === spot.row &&
				standing.column === spot.column
			) {
				return standing.position;
			}
			return nextPosition(this.filed(), unitId, spot.row, spot.column);
		},
	});

	protected readonly unit = computed(
		() => this.units().find((drawn) => drawn.id === this.unitId()) ?? null
	);

	/** The chosen unit drawn out, compartment by compartment. */
	protected readonly cells = computed<SpotCell[]>(() => {
		const unit = this.unit();

		if (!unit) {
			return [];
		}

		const here = this.spot();
		const counts = new Map<string, number>();

		for (const placement of this.filed()) {
			const key = spotKey(
				placement.unitId,
				placement.row,
				placement.column
			);

			counts.set(key, (counts.get(key) ?? 0) + 1);
		}

		return unitSpots(unit).map((cell) => ({
			key: spotKey(cell.unitId, cell.row, cell.column),
			row: cell.row,
			column: cell.column,
			label: cell.label,
			filed: counts.get(spotKey(cell.unitId, cell.row, cell.column)) ?? 0,
			chosen:
				!!here && here.row === cell.row && here.column === cell.column,
		}));
	});

	protected readonly canPlace = computed(
		() => !!this.spot() && !!this.unit() && !this.busy()
	);

	private readonly dialog =
		viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

	public constructor() {
		afterNextRender(() => this.dialog().nativeElement.showModal());

		// Escape must not close the dialog halfway through the write.
		effect((onCleanup) => {
			const dialog = this.dialog().nativeElement;
			const busy = this.busy();
			const onCancel = (event: Event) => {
				if (busy) {
					event.preventDefault();
				}
			};

			dialog.addEventListener('cancel', onCancel);
			onCleanup(() => dialog.removeEventListener('cancel', onCancel));
		});
	}

	protected close(): void {
		if (!this.busy()) {
			this.dialog().nativeElement.close();
		}
	}

	protected pick(row: number, column: number): void {
		this.spot.set({ row, column });
	}

	protected onPosition(event: Event): void {
		const value = Number((event.target as HTMLInputElement).value);

		this.position.set(
			Number.isFinite(value)
				? Math.min(MAX_SHELF_POSITION, Math.max(1, Math.round(value)))
				: 1
		);
	}

	protected submit(): void {
		const spot = this.spot();

		if (spot && this.canPlace()) {
			this.placed.emit({
				unitId: this.unitId(),
				row: spot.row,
				column: spot.column,
				position: this.position(),
			});
		}
	}

	/** Takes the place back; the shelf files the copy again. */
	protected takeOff(): void {
		if (!this.busy()) {
			this.placed.emit(null);
		}
	}
}
