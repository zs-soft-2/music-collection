import {
	ChangeDetectionStrategy,
	Component,
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
	],
	host: {
		'[class.has-admin]': 'adminAccess.isAdmin()',
		'[class.has-place]': 'canPlace()',
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

		@if (canPlace()) {
			<button
				type="button"
				class="row-place"
				[attr.data-place-copy]="item.id"
				[attr.aria-label]="
					(item.placement ? 'Move ' : 'Place ') +
					item.title +
					' on the shelf'
				"
				[title]="
					item.placement ? 'Move on the shelf' : 'Place on the shelf'
				"
				(click)="place.emit(item.id)"
			>
				<i class="pi pi-bookmark" aria-hidden="true"></i>
			</button>
		}

		<mc-admin-edit-link
			class="mc-row-admin"
			variant="icon"
			entity="collection-item"
			[id]="item.id"
			[name]="item.artistName + ' — ' + item.title"
		/>
	`,
	styles: `
		:host {
			position: relative;
			display: block;
		}

		:host(.has-admin) .row {
			padding-right: 3.25rem;
		}

		:host(.has-place) .row {
			padding-right: 3.25rem;
		}

		:host(.has-place.has-admin) .row {
			padding-right: 5.75rem;
		}

		.row-place {
			position: absolute;
			top: 50%;
			right: 0.6rem;
			display: grid;
			place-items: center;
			width: 2rem;
			height: 2rem;
			color: var(--mc-text-muted);
			cursor: pointer;
			background: transparent;
			border: 0;
			border-radius: 999px;
			transform: translateY(-50%);
		}

		:host(.has-admin) .row-place {
			right: 3.1rem;
		}

		.row-place:hover,
		.row-place:focus-visible {
			color: var(--mc-text);
			background: var(--mc-bg-muted);
		}

		.mc-row-admin {
			position: absolute;
			top: 50%;
			right: 0.6rem;
			transform: translateY(-50%);
		}

		.row {
			display: grid;
			grid-template-columns: 52px minmax(0, 1fr) auto 3.5rem 5.5rem 7rem;
			gap: 1rem;
			align-items: center;
			padding: 0.45rem 0.9rem 0.45rem 0.45rem;
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
}
