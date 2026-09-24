import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	SHELF_CUBBY_SIZE,
	SHELF_LIMITS,
} from '../../../collection/shelf-layout.setting';
import { ProfilePageStore } from '../../profile-page.store';

/** One drawn unit, with the compartments the collection would fill in it. */
interface ShelfDrawing {
	id: string;
	name: string;
	rows: number;
	columns: number;
	compartments: number;
	records: number;
	/** What the shape comes out as: 4 × 2 stands, 2 × 4 lies down. */
	stance: string;
	/** One per compartment, true where a record would already stand. */
	cells: boolean[];
	first: boolean;
	last: boolean;
}

/**
 * The room the records live in. The collector draws their actual furniture
 * here — how many units, and how many compartments each one has across and
 * down — and the shelf view files the collection into it in this order.
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
						<div
							class="drawing"
							[style.--cols]="shelf.columns"
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

							<p class="note">
								{{ shelf.stance }} ·
								{{
									'ui.profileShelves.unitNote'
										| transloco
											: {
													compartments:
														shelf.compartments,
													records: shelf.records,
											  }
								}}
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
										records: room().records,
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

		/* The furniture itself, at a size that fits in a settings card. */
		.drawing {
			display: grid;
			grid-template-columns: repeat(var(--cols), 16px);
			gap: 3px;
			padding: 4px;
			background: linear-gradient(180deg, #4a3826, #2b1f14);
			border-radius: 3px;
		}

		.cell {
			width: 16px;
			height: 16px;
			background: #101010;
			border-radius: 1px;
		}

		/* A compartment the collection already reaches. */
		.cell.is-filled {
			background: var(--mc-primary);
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

		.times {
			color: var(--mc-text-subtle);
		}

		.note {
			margin: 0;
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
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
	`,
})
export class ProfileShelvesComponent {
	protected readonly store = inject(ProfilePageStore);
	protected readonly limits = SHELF_LIMITS;
	protected readonly room = this.store.shelfRoom;

	/**
	 * The furniture as drawn, with the collection filed into it the way the
	 * shelf view will: each unit fills up before the next one is touched.
	 */
	protected readonly shelves = computed<ShelfDrawing[]>(() => {
		const units = this.store.shelfLayout();
		let left = Math.ceil(this.store.collectionSize() / SHELF_CUBBY_SIZE);

		return units.map((unit, index) => {
			const compartments = unit.rows * unit.columns;
			const filled = Math.min(left, compartments);

			left -= filled;

			return {
				id: unit.id,
				name: unit.name,
				rows: unit.rows,
				columns: unit.columns,
				compartments,
				records: compartments * SHELF_CUBBY_SIZE,
				stance:
					unit.rows === unit.columns
						? 'Square'
						: unit.rows > unit.columns
							? 'Upright'
							: 'On its side',
				cells: Array.from(
					{ length: compartments },
					(_, cell) => cell < filled
				),
				first: index === 0,
				last: index === units.length - 1,
			};
		});
	});
}
