import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	SHELF_HEIGHT_UNIT_CM,
	SHELF_LIMITS,
	SHELF_MEDIA,
	SHELF_MEDIA_SIZES,
	SHELF_PX_PER_MM,
	SHELF_WIDTH_KINDS,
	ShelfMedia,
	ShelfStance,
	ShelfUnitLayout,
	ShelfWidths,
	cubbyHolds,
} from '../../../collection/shelf-layout.setting';
import { ProfilePageStore } from '../../profile-page.store';

/** What a compartment of this size holds, if it held nothing else. */
interface Holds {
	media: ShelfMedia;
	count: number;
}

/** One kind of copy, at the width the collector measured it at. */
interface SpineWidth {
	media: ShelfMedia;
	/** What is typed: whole pixels of drawn spine. */
	px: number;
	/** The same width as the shelf counts it, to the tenth of a millimetre. */
	mm: number;
	/** The collector set this one; the rest are the standard sizes. */
	set: boolean;
}

/** One drawn unit, with the compartments the collection would fill in it. */
interface ShelfDrawing {
	id: string;
	name: string;
	rows: number;
	columns: number;
	compartments: number;
	height: number;
	/** The compartment length in whole centimetres, as it is typed. */
	lengthCm: number;
	stance: ShelfStance;
	/** What it holds of each medium that fits, roomiest first. */
	holds: Holds[];
	/** Compartment size on the drawing, in pixels. */
	cell: { width: number; height: number };
	/** One per compartment, true where a record would already stand. */
	cells: boolean[];
	first: boolean;
	last: boolean;
}

/*
 * The little drawing is to scale: a compartment as long as a Kallax cubby is
 * drawn square, a CD rack lower and a cassette tower as the column it is. A
 * unit too big for the settings card is scaled down whole rather than
 * cropped, so the proportions survive.
 */
const PX_PER_MM = 0.06;
const PX_PER_HEIGHT_UNIT = SHELF_HEIGHT_UNIT_CM * 10 * PX_PER_MM;
const DRAWING = { width: 132, height: 120, minCell: 4 };

/**
 * The room the records live in. The collector draws their actual furniture
 * here — how many units, how many compartments each one has across and down,
 * and how big one of those compartments is — and the shelf view files the
 * collection into it in this order.
 *
 * A compartment has two measurements because it takes two to say what goes
 * in it: the height decides *what* fits (an LP needs 32 cm, a CD 12) and the
 * length decides *how much*. That is what lets a collector draw the CD rack
 * and the cassette tower they actually have, instead of pretending every
 * piece of furniture is a record cubby.
 *
 * The drawing fills up as the collection does, so it is plain before saving
 * anything whether what is drawn has room for the records.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-shelves',
	imports: [...I18N_IMPORTS],
	template: `
		<p class="intro">
			{{ 'ui.profileShelves.draw-the-shelving-you' | transloco }}
		</p>

		@if (shelves().length) {
			<ul class="units">
				@for (shelf of shelves(); track shelf.id) {
					<li class="unit">
						<div class="drawing-box">
							<div
								class="drawing"
								[class.is-down]="shelf.stance === 'down'"
								[style.--cols]="shelf.columns"
								[style.--cell-w.px]="shelf.cell.width"
								[style.--cell-h.px]="shelf.cell.height"
								[attr.aria-label]="
									shelf.rows + ' by ' + shelf.columns
								"
							>
								@for (cell of shelf.cells; track $index) {
									<span
										class="cell"
										[class.is-filled]="cell"
										aria-hidden="true"
									></span>
								}
							</div>
						</div>

						<div class="controls">
							<input
								#name
								class="name"
								type="text"
								[placeholder]="
									'ui.profileShelves.shelf-name' | transloco
								"
								[value]="shelf.name"
								[attr.maxlength]="limits.maxNameLength"
								[attr.aria-label]="'Shelf name'"
								(change)="
									store.renameShelf(shelf.id, name.value)
								"
							/>

							<div class="sizes">
								<span class="size">
									<span class="size-label">{{
										'ui.profileShelves.rows' | transloco
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.one-row-fewer'
												| transloco
										"
										[disabled]="
											shelf.rows <= limits.minSide
										"
										(click)="
											store.resizeShelf(shelf.id, {
												rows: shelf.rows - 1,
											})
										"
									>
										−
									</button>
									<span class="size-value">{{
										shelf.rows
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.one-row-more'
												| transloco
										"
										[disabled]="
											shelf.rows >= limits.maxSide
										"
										(click)="
											store.resizeShelf(shelf.id, {
												rows: shelf.rows + 1,
											})
										"
									>
										+
									</button>
								</span>

								<span class="times" aria-hidden="true">×</span>

								<span class="size">
									<span class="size-label">{{
										'ui.profileShelves.columns' | transloco
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.one-column-fewer'
												| transloco
										"
										[disabled]="
											shelf.columns <= limits.minSide
										"
										(click)="
											store.resizeShelf(shelf.id, {
												columns: shelf.columns - 1,
											})
										"
									>
										−
									</button>
									<span class="size-value">{{
										shelf.columns
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.one-column-more'
												| transloco
										"
										[disabled]="
											shelf.columns >= limits.maxSide
										"
										(click)="
											store.resizeShelf(shelf.id, {
												columns: shelf.columns + 1,
											})
										"
									>
										+
									</button>
								</span>
							</div>

							<!--
								The compartment itself: how tall it is, how
								long it is, and whether the copies stand in it
								or lie stacked.
							-->
							<div class="sizes">
								<span class="size">
									<span class="size-label">{{
										'ui.profileShelves.cubby-height'
											| transloco
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.one-notch-lower'
												| transloco
										"
										[disabled]="
											shelf.height <= limits.minHeight
										"
										(click)="
											store.measureShelf(shelf.id, {
												height: shelf.height - 1,
											})
										"
									>
										−
									</button>
									<span class="size-value">{{
										shelf.height * heightUnitCm
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.one-notch-higher'
												| transloco
										"
										[disabled]="
											shelf.height >= limits.maxHeight
										"
										(click)="
											store.measureShelf(shelf.id, {
												height: shelf.height + 1,
											})
										"
									>
										+
									</button>
									<span class="unit-of">cm</span>
								</span>

								<span class="size">
									<span class="size-label">{{
										'ui.profileShelves.cubby-length'
											| transloco
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.shorter'
												| transloco
										"
										[disabled]="
											shelf.lengthCm * 10 <=
											limits.minLength
										"
										(click)="
											store.measureShelf(shelf.id, {
												length:
													(shelf.lengthCm - 1) * 10,
											})
										"
									>
										−
									</button>
									<span class="size-value">{{
										shelf.lengthCm
									}}</span>
									<button
										type="button"
										[attr.aria-label]="
											'ui.profileShelves.longer'
												| transloco
										"
										[disabled]="
											shelf.lengthCm * 10 >=
											limits.maxLength
										"
										(click)="
											store.measureShelf(shelf.id, {
												length:
													(shelf.lengthCm + 1) * 10,
											})
										"
									>
										+
									</button>
									<span class="unit-of">cm</span>
								</span>

								<span
									class="stance"
									role="group"
									[attr.aria-label]="
										'ui.profileShelves.how-the-copies-lie'
											| transloco
									"
								>
									<button
										type="button"
										[class.is-on]="
											shelf.stance === 'across'
										"
										[attr.aria-pressed]="
											shelf.stance === 'across'
										"
										(click)="
											store.turnShelf(shelf.id, 'across')
										"
									>
										{{
											'ui.profileShelves.standing'
												| transloco
										}}
									</button>
									<button
										type="button"
										[class.is-on]="shelf.stance === 'down'"
										[attr.aria-pressed]="
											shelf.stance === 'down'
										"
										(click)="
											store.turnShelf(shelf.id, 'down')
										"
									>
										{{
											'ui.profileShelves.stacked'
												| transloco
										}}
									</button>
								</span>
							</div>

							<p class="note">
								{{
									'ui.profileShelves.unitNote'
										| transloco
											: {
													compartments:
														shelf.compartments,
											  }
								}}
								@if (shelf.holds.length) {
									<span class="holds">
										@for (
											hold of shelf.holds;
											track hold.media
										) {
											<span class="hold"
												>{{ hold.count }}
												{{
													'catalog.media.' +
														hold.media | transloco
												}}</span
											>
										}
									</span>
								} @else {
									<span class="holds is-empty">{{
										'ui.profileShelves.nothing-fits'
											| transloco
									}}</span>
								}
							</p>

							<div class="actions">
								<button
									type="button"
									[attr.aria-label]="
										'ui.profileShelves.move-this-shelf-earlier'
											| transloco
									"
									[disabled]="shelf.first"
									(click)="store.moveShelf(shelf.id, -1)"
								>
									<i class="pi pi-arrow-up"></i>
								</button>
								<button
									type="button"
									[attr.aria-label]="
										'ui.profileShelves.move-this-shelf-later'
											| transloco
									"
									[disabled]="shelf.last"
									(click)="store.moveShelf(shelf.id, 1)"
								>
									<i class="pi pi-arrow-down"></i>
								</button>
								<button
									type="button"
									class="remove"
									[attr.aria-label]="
										'ui.profileShelves.remove-this-shelf'
											| transloco
									"
									(click)="store.removeShelf(shelf.id)"
								>
									<i class="pi pi-trash"></i>
								</button>
							</div>
						</div>
					</li>
				}
			</ul>
		} @else {
			<p class="empty">
				{{ 'ui.profileShelves.nothing-drawn-yet-the' | transloco }}
			</p>
		}

		<!--
			How wide the things standing on the shelf are. It is one measurement
			doing two jobs: how wide a spine is drawn, and how many copies a
			compartment is reckoned to hold — which on a real shelf is the same
			question. Typed in pixels because that is what the collector is
			looking at while they set it; the millimetres beside it are what the
			shelf files by.
		-->
		<section class="widths">
			<h4 class="widths-head">
				{{ 'ui.profileShelves.widths-title' | transloco }}
			</h4>
			<p class="intro">
				{{ 'ui.profileShelves.widths-intro' | transloco }}
			</p>

			<ul class="width-list">
				@for (width of widths(); track width.media) {
					<li class="width" [class.is-set]="width.set">
						<span class="width-label">{{
							'ui.profileShelves.spine.' + width.media | transloco
						}}</span>

						<span class="size">
							<button
								type="button"
								[attr.aria-label]="
									'ui.profileShelves.one-pixel-narrower'
										| transloco
								"
								[disabled]="width.px <= minPx"
								(click)="setWidth(width, -1)"
							>
								−
							</button>
							<span class="size-value">{{ width.px }}</span>
							<button
								type="button"
								[attr.aria-label]="
									'ui.profileShelves.one-pixel-wider'
										| transloco
								"
								[disabled]="width.px >= maxPx"
								(click)="setWidth(width, 1)"
							>
								+
							</button>
							<span class="unit-of">px</span>
						</span>

						<span class="width-mm">{{ width.mm }} mm</span>

						@if (width.set) {
							<button
								type="button"
								class="width-reset"
								(click)="store.measureSpine(width.media, null)"
							>
								{{ 'ui.profileShelves.standard' | transloco }}
							</button>
						}
					</li>
				}
			</ul>
		</section>

		<div class="room-foot">
			<button
				type="button"
				class="add"
				[disabled]="room().full"
				(click)="store.addShelf()"
			>
				<i class="pi pi-plus" aria-hidden="true"></i>
				{{ 'ui.profileShelves.add-shelf' | transloco }}
			</button>

			@if (shelves().length) {
				<button
					type="button"
					class="clear"
					(click)="store.clearShelves()"
				>
					{{ 'ui.profileShelves.remove-all' | transloco }}
				</button>
			}

			<p class="summary">
				@if (room().units) {
					{{
						'ui.profileShelves.roomNote'
							| transloco
								: {
										units: room().units,
										compartments: room().compartments,
										length: room().lengthCm,
										holds: room().holds,
								  }
					}}
				}
				@if (room().short) {
					<span class="short">
						{{ room().short | mcPlural: 'ui.profileShelves.short' }}
					</span>
				}
			</p>
		</div>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
		}

		.intro,
		.empty,
		.summary {
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}

		.units {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			padding: 0;
			margin: 0;
			list-style: none;
		}

		.unit {
			display: flex;
			flex-wrap: wrap;
			gap: 1rem;
			align-items: flex-start;
			padding: 0.85rem;
			background: var(--mc-surface-2);
			border-radius: var(--mc-radius-md);
		}

		/* Keeps the row from jumping as a unit is redrawn taller or longer. */
		.drawing-box {
			display: flex;
			flex: none;
			align-items: center;
			justify-content: center;
			width: 140px;
			min-height: 68px;
		}

		/* The furniture itself, drawn to the compartment's own proportions. */
		.drawing {
			display: grid;
			grid-template-columns: repeat(var(--cols), var(--cell-w));
			gap: 3px;
			padding: 4px;
			background: linear-gradient(180deg, #4a3826, #2b1f14);
			border-radius: 3px;
		}

		.cell {
			width: var(--cell-w);
			height: var(--cell-h);
			background: #101010;
			border-radius: 1px;
		}

		/* A compartment the collection already reaches. */
		.cell.is-filled {
			background: var(--mc-primary);
		}

		/* Copies lying stacked read as lines across the compartment. */
		.drawing.is-down .cell {
			background-image: repeating-linear-gradient(
				180deg,
				rgb(255 255 255 / 12%) 0 1px,
				transparent 1px 4px
			);
		}

		.controls {
			display: flex;
			flex: 1 1 15rem;
			flex-direction: column;
			gap: 0.5rem;
		}

		.name {
			width: 100%;
			max-width: 18rem;
			padding: 0.4rem 0.6rem;
			font: inherit;
			font-size: 0.875rem;
			color: var(--mc-text);
			background: var(--mc-surface);
			border: 1px solid transparent;
			border-radius: var(--mc-radius-sm);

			&:focus {
				border-color: var(--mc-primary);
				outline: none;
			}
		}

		.sizes {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			align-items: center;
		}

		.size {
			display: inline-flex;
			gap: 0.35rem;
			align-items: center;
		}

		.size-label {
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.size-value {
			min-width: 1.25rem;
			font-size: 0.9rem;
			font-weight: 600;
			color: var(--mc-text);
			text-align: center;
		}

		.unit-of,
		.times {
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
		}

		.stance {
			display: inline-flex;
			gap: 0.25rem;
		}

		.stance button.is-on {
			color: var(--mc-text);
			border-color: var(--mc-primary);
		}

		.note {
			display: flex;
			flex-wrap: wrap;
			gap: 0.35rem 0.5rem;
			align-items: baseline;
			margin: 0;
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
		}

		/* What a single compartment holds, one medium at a time. */
		.holds {
			display: inline-flex;
			flex-wrap: wrap;
			gap: 0.35rem;
		}

		.hold {
			padding: 0.05rem 0.35rem;
			background: var(--mc-surface);
			border-radius: var(--mc-radius-sm);
		}

		.holds.is-empty {
			color: var(--mc-primary);
		}

		.actions {
			display: flex;
			gap: 0.35rem;
		}

		button {
			display: inline-flex;
			gap: 0.4rem;
			align-items: center;
			justify-content: center;
			min-width: 1.9rem;
			padding: 0.35rem 0.6rem;
			font: inherit;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
			background: var(--mc-surface);
			border: 1px solid transparent;
			border-radius: var(--mc-radius-sm);
			cursor: pointer;

			&:hover:not(:disabled) {
				color: var(--mc-text);
				border-color: var(--mc-primary);
			}

			&:disabled {
				opacity: 0.4;
				cursor: not-allowed;
			}
		}

		.remove:hover:not(:disabled) {
			color: var(--mc-primary);
		}

		.room-foot {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 0.75rem;
			align-items: center;
		}

		.clear {
			color: var(--mc-text-subtle);
		}

		.summary {
			flex: 1 1 12rem;
		}

		.short {
			display: block;
			color: var(--mc-primary);
		}

		.widths {
			display: flex;
			flex-direction: column;
			gap: 0.6rem;
			padding-top: 0.75rem;
			border-top: 1px solid var(--mc-border);
		}

		.widths-head {
			margin: 0;
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--mc-text);
		}

		.width-list {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
			gap: 0.4rem 1rem;
			padding: 0;
			margin: 0;
			list-style: none;
		}

		/*
		 * Two lines whatever the name is: what it is and how wide, then what
		 * that comes to in millimetres. A row that laid itself out around the
		 * label would put the millimetres in a different place on every line.
		 */
		.width {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 0.1rem 0.5rem;
			align-items: center;
			padding: 0.35rem 0.5rem;
			background: var(--mc-surface-2);
			border-radius: var(--mc-radius-sm);
		}

		.width-mm {
			grid-column: 1;
		}

		.width-reset {
			grid-column: 2;
			justify-self: end;
		}

		/* A width the collector set themselves, against the standard ones. */
		.width.is-set {
			box-shadow: inset 2px 0 0 var(--mc-primary);
		}

		.width-label {
			font-size: 0.8125rem;
			color: var(--mc-text);
		}

		.width-mm,
		.width-reset {
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
		}

		.width-reset {
			padding: 0.1rem 0.4rem;
			background: none;
		}
	`,
})
export class ProfileShelvesComponent {
	protected readonly store = inject(ProfilePageStore);
	protected readonly limits = SHELF_LIMITS;
	protected readonly heightUnitCm = SHELF_HEIGHT_UNIT_CM;
	protected readonly room = this.store.shelfRoom;
	/* The same bounds the setting clamps to, said in what is typed. */
	protected readonly minPx = Math.round(
		SHELF_LIMITS.minWidth * SHELF_PX_PER_MM
	);
	protected readonly maxPx = Math.round(
		SHELF_LIMITS.maxWidth * SHELF_PX_PER_MM
	);

	/**
	 * How wide each kind of copy stands. What the collector has not measured
	 * shows the standard size rather than nothing: it is the number they are
	 * about to change, and a blank would make them guess at it first.
	 */
	protected readonly widths = computed<SpineWidth[]>(() => {
		const set: ShelfWidths = this.store.shelfWidths();

		return SHELF_WIDTH_KINDS.map((media) => {
			const mm = set[media] ?? SHELF_MEDIA_SIZES[media].thickness;

			return {
				media,
				px: Math.round(mm * SHELF_PX_PER_MM),
				mm: Math.round(mm * 10) / 10,
				set: set[media] !== undefined,
			};
		});
	});

	/** One pixel wider or narrower, in the millimetres that are stored. */
	protected setWidth(width: SpineWidth, step: -1 | 1): void {
		this.store.measureSpine(
			width.media,
			(width.px + step) / SHELF_PX_PER_MM
		);
	}

	/**
	 * The furniture as drawn, with the collection filed into it the way the
	 * shelf view will: each unit fills up before the next one is touched.
	 */
	protected readonly shelves = computed<ShelfDrawing[]>(() => {
		const units = this.store.shelfLayout();
		const widths = this.store.shelfWidths();
		const filled = this.room().filled;
		let at = 0;

		return units.map((unit, index) => {
			const compartments = unit.rows * unit.columns;
			const cells = filled
				.slice(at, at + compartments)
				.map((count) => count > 0);

			at += compartments;

			return {
				id: unit.id,
				name: unit.name,
				rows: unit.rows,
				columns: unit.columns,
				compartments,
				height: unit.cubby.height,
				lengthCm: Math.round(unit.cubby.length / 10),
				stance: unit.cubby.stance,
				holds: holdsOf(unit, widths),
				cell: cellOf(unit),
				/* A drawing shorter than the grid means nothing is in the rest. */
				cells: Array.from(
					{ length: compartments },
					(_, cell) => cells[cell] ?? false
				),
				first: index === 0,
				last: index === units.length - 1,
			};
		});
	});
}

/**
 * What one compartment holds of each medium that fits, roomiest first — at
 * the widths the collector measured, so the readout answers the question
 * they are actually asking while they set them.
 */
function holdsOf(unit: ShelfUnitLayout, widths: ShelfWidths): Holds[] {
	return SHELF_MEDIA.map((media) => ({
		media,
		count: cubbyHolds(unit.cubby, media, widths),
	}))
		.filter((hold) => hold.count > 0)
		.sort((a, b) => b.count - a.count);
}

/**
 * One compartment on the drawing. The whole unit is scaled to fit the card,
 * so a cassette tower is drawn as the column it is rather than running off
 * the page — and two units drawn side by side can still be compared.
 */
function cellOf(unit: ShelfUnitLayout): { width: number; height: number } {
	const along = unit.cubby.length * PX_PER_MM;
	const across = unit.cubby.height * PX_PER_HEIGHT_UNIT;
	const raw =
		unit.cubby.stance === 'down'
			? { width: across, height: along }
			: { width: along, height: across };
	const scale = Math.min(
		1,
		DRAWING.width / (raw.width * unit.columns),
		DRAWING.height / (raw.height * unit.rows)
	);

	return {
		width: Math.max(DRAWING.minCell, Math.round(raw.width * scale)),
		height: Math.max(DRAWING.minCell, Math.round(raw.height * scale)),
	};
}
