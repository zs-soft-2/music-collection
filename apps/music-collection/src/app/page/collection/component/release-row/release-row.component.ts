import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	AdminAccessService,
	AdminEditLinkComponent,
	FormatBadgeComponent,
	ReleaseView,
	StarRatingComponent,
} from '../../../../shared/music-ui';

/** Dense list row for large collections — the whole row opens the copy. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-row',
	imports: [
		...I18N_IMPORTS,
		RouterLink,
		FormatBadgeComponent,
		AdminEditLinkComponent,
		StarRatingComponent,
	],
	host: {
		// The row keeps room at its end for as many icons as are actually
		// shown, rather than for every combination of them spelled out.
		'[style.--mc-row-actions]': 'actionCount()',
	},
	template: `
		@let item = release();

		<a class="row" [routerLink]="['/collection', 'copy', item.id]">
			<span class="thumb">
				@if (item.coverUrl) {
					<img [src]="item.coverUrl" alt="" loading="lazy" />
				} @else {
					<span class="thumb-placeholder" aria-hidden="true">♪</span>
				}
			</span>

			<span class="body">
				<span class="title">{{ item.title }}</span>
				<span class="artist">{{ item.artistName }}</span>
			</span>

			@if (stars(); as given) {
				<mc-star-rating
					class="stars"
					[stars]="given"
					[readonly]="true"
					[label]="given | mcPlural: 'ui.starRating.starCount'"
				/>
			}

			<span class="tags">
				@for (edition of item.editions; track edition) {
					<span class="tag">{{ edition }}</span>
				}
			</span>

			<span class="year">{{ item.year ?? '—' }}</span>
			<span class="type">{{ item.albumType ?? '' }}</span>
			<mc-format-badge
				class="format"
				[format]="item.format"
				[weight]="item.weight"
			/>
		</a>

		<span class="row-actions">
			@if (canRemove()) {
				<button
					type="button"
					class="row-action"
					[attr.data-remove-copy]="item.id"
					[attr.aria-label]="
						'ui.copyRemoval.removeTitle'
							| transloco: { title: item.title }
					"
					[title]="
						'ui.copyRemoval.remove-from-collection' | transloco
					"
					(click)="remove.emit(item.id)"
				>
					<i class="pi pi-sign-out" aria-hidden="true"></i>
				</button>
			}
			@if (canPlace()) {
				<button
					type="button"
					class="row-action"
					[attr.data-place-copy]="item.id"
					[attr.aria-label]="
						(item.placement ? 'Move ' : 'Place ') +
						item.title +
						' on the shelf'
					"
					[title]="
						item.placement
							? 'Move on the shelf'
							: 'Place on the shelf'
					"
					(click)="place.emit(item.id)"
				>
					<i class="pi pi-bookmark" aria-hidden="true"></i>
				</button>
			}

			<mc-admin-edit-link
				variant="icon"
				entity="collection-item"
				[id]="item.id"
				[name]="item.artistName + ' — ' + item.title"
			/>
		</span>
	`,
	styles: `
		:host {
			position: relative;
			display: block;
		}

		.row-actions {
			position: absolute;
			top: 50%;
			right: 0.6rem;
			display: flex;
			gap: 0.15rem;
			align-items: center;
			transform: translateY(-50%);
		}

		.row-action {
			display: grid;
			place-items: center;
			width: var(--mc-circle-xs);
			height: var(--mc-circle-xs);
			color: var(--mc-text-muted);
			cursor: pointer;
			background: transparent;
			border: 0;
			border-radius: 999px;
		}

		.row-action:hover,
		.row-action:focus-visible {
			color: var(--mc-text);
			background: var(--mc-bg-muted);
		}

		.row {
			display: grid;
			grid-template-columns: 52px minmax(0, 1fr) auto 3.5rem 5.5rem 7rem;
			gap: 1rem;
			align-items: center;
			padding: 0.45rem
				calc(
					1.1rem + var(--mc-row-actions, 0) *
						(var(--mc-circle-xs) + 0.15rem)
				)
				0.45rem 0.45rem;
			color: var(--mc-text);
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			transition:
				background var(--mc-duration-fast) ease,
				border-color var(--mc-duration-fast) ease;
		}

		.row:hover,
		.row:focus-visible {
			background: var(--mc-card-bg-hover);
			border-color: var(--mc-border-strong);
		}

		.row:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 2px;
		}

		.thumb {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 52px;
			height: 52px;
			overflow: hidden;
			background: var(--mc-bg-muted);
			border-radius: var(--mc-radius-sm);
		}

		.thumb img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.thumb-placeholder {
			color: var(--mc-text-subtle);
		}

		.body {
			display: flex;
			flex-direction: column;
			min-width: 0;
		}

		.title,
		.artist {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.title {
			font-weight: 600;
		}

		.artist {
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.tags {
			display: flex;
			gap: 0.3rem;
		}

		.tag {
			padding: 0.1rem 0.4rem;
			font-size: 0.6rem;
			font-weight: 700;
			text-transform: uppercase;
			color: #000;
			white-space: nowrap;
			background: var(--mc-accent);
			border-radius: var(--mc-radius-sm);
		}

		.year,
		.type {
			font-size: 0.85rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		.format {
			justify-self: end;
		}

		@media (max-width: 720px) {
			.row {
				grid-template-columns: 44px minmax(0, 1fr) auto;
				gap: 0.75rem;
			}

			.thumb {
				width: 44px;
				height: 44px;
			}

			.tags,
			.year,
			.type {
				display: none;
			}

			.stars {
				display: none;
			}
		}
	`,
})
export class ReleaseRowComponent {
	protected readonly adminAccess = inject(AdminAccessService);

	public readonly release = input.required<ReleaseView>();
	/** The collector may file this copy on their drawn shelf. */
	public readonly canPlace = input(false);
	/** The copy to file, by its collection item id. */
	public readonly place = output<string>();
	/** The collector may let this copy go — sold, traded, lost. */
	public readonly canRemove = input(false);
	/** The copy to let go of, by its collection item id. */
	public readonly remove = output<string>();
	/** The collector's verdict on the record, where they gave one. */
	public readonly stars = input<number | null>(null);

	/** How many icons stand at the end of the row, admin's own included. */
	protected readonly actionCount = computed(
		() =>
			(this.canPlace() ? 1 : 0) +
			(this.canRemove() ? 1 : 0) +
			(this.adminAccess.isAdmin() ? 1 : 0)
	);
}
