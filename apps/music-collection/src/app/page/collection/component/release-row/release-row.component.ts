import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	AdminAccessService,
	AdminEditLinkComponent,
	FormatBadgeComponent,
	ReleaseView,
} from '../../../../shared/music-ui';

/** Dense list row for large collections — the whole row links to the album. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-row',
	imports: [RouterLink, FormatBadgeComponent, AdminEditLinkComponent],
	host: {
		'[class.has-admin]': 'adminAccess.isAdmin()',
	},
	template: `
		@let item = release();

		<a class="row" [routerLink]="['/album', item.albumId]">
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
}
