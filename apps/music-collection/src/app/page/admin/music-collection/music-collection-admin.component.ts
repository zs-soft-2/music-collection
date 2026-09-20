import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	MusicCollectionAdminStore,
	StatusFilter,
} from './music-collection-admin.store';

/** Admin: the abstract collections — the rules a badge is measured against. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-music-collection-admin',
	providers: [MusicCollectionAdminStore],
	imports: [RouterLink],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>Collections</h1>
				<p>
					Sets of records defined by a rule. What belongs to one is
					resolved against the catalog, so a collection grows with it
					— and the badge is earned by owning all of them.
				</p>
			</div>
			<div class="mc-page-actions">
				<a class="button is-primary" [routerLink]="['edit', 0]">
					Add collection
				</a>
			</div>
		</header>

		<div class="filters" role="group" aria-label="Filter by status">
			@for (filter of filters; track filter.value) {
				<button
					type="button"
					class="chip"
					[attr.aria-pressed]="store.statusFilter() === filter.value"
					(click)="store.setStatusFilter(filter.value)"
				>
					{{ filter.label }}
					<span class="count">{{
						store.counts()[filter.value]
					}}</span>
				</button>
			}
		</div>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">Loading collections…</span>
			</div>
		} @else if (!store.visibleRows().length) {
			<p class="empty">No collection here yet.</p>
		} @else {
			<ul class="rows">
				@for (row of store.visibleRows(); track row.uid) {
					<li class="row" [class.is-draft]="row.status === 'draft'">
						<div class="main">
							<a class="name" [routerLink]="['edit', row.uid]">
								{{ row.name }}
							</a>
							<p class="summary">{{ row.summary }}</p>
							<p class="meta">
								<span class="slug">/{{ row.slug }}</span>
								@if (row.parentName) {
									<span>· under {{ row.parentName }}</span>
								}
								@if (row.badgeName) {
									<span>· badge: {{ row.badgeName }}</span>
								}
							</p>
						</div>

						<div class="side">
							<span class="tag">{{ row.status }}</span>
							<span class="tag">{{ row.visibility }}</span>
							<span class="total">
								<strong>{{ row.total }}</strong> records
							</span>
						</div>

						<div class="actions">
							<a class="button" [routerLink]="['edit', row.uid]"
								>Edit</a
							>
							<button
								type="button"
								class="button is-danger"
								[disabled]="store.busyUid() === row.uid"
								(click)="store.askDeletion(row)"
							>
								Delete
							</button>
						</div>
					</li>
				}
			</ul>
		}

		@if (store.pendingDeletion(); as pending) {
			<div
				class="confirm"
				role="alertdialog"
				aria-labelledby="confirm-title"
			>
				<p id="confirm-title">
					Delete <strong>{{ pending.name }}</strong
					>? Whoever earned its badge loses it, and this cannot be
					undone here.
				</p>
				<div class="confirm-actions">
					<button
						type="button"
						class="button"
						(click)="store.cancelDeletion()"
					>
						Cancel
					</button>
					<button
						type="button"
						class="button is-danger"
						[disabled]="store.busyUid() !== null"
						(click)="store.confirmDeletion()"
					>
						{{ store.busyUid() ? 'Deleting…' : 'Delete' }}
					</button>
				</div>
			</div>
		}
	`,
	styles: `
		:host {
			display: block;
		}

		.filters {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin-bottom: 1.25rem;
		}

		.chip {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			padding: 0.35rem 0.85rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
			font: inherit;
			font-size: 0.85rem;
			color: var(--mc-text);
			background: transparent;
			cursor: pointer;

			&[aria-pressed='true'] {
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 2px;
			}
		}

		.count {
			font-variant-numeric: tabular-nums;
			opacity: 0.8;
		}

		.rows {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 1rem;
			padding: 1rem 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);

			&.is-draft {
				border-style: dashed;
			}
		}

		.main {
			flex: 1 1 20rem;
			min-width: 0;
		}

		.name {
			font-size: 1.05rem;
			font-weight: 600;
			color: var(--mc-text);
			text-decoration: none;

			&:hover {
				color: var(--mc-primary);
			}
		}

		.summary {
			margin: 0.25rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.meta {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;
			margin: 0.3rem 0 0;
			font-size: 0.78rem;
			color: var(--mc-text-subtle);
		}

		.slug {
			font-family: var(--mc-font-mono, monospace);
		}

		.side {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;
		}

		.tag {
			padding: 0.15rem 0.5rem;
			font-size: 0.72rem;
			letter-spacing: 0.06em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
		}

		.total {
			font-size: 0.85rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;

			strong {
				color: var(--mc-text);
			}
		}

		.actions {
			display: flex;
			gap: 0.5rem;
		}

		.button {
			padding: 0.4rem 0.9rem;
			font: inherit;
			font-size: 0.85rem;
			color: var(--mc-text);
			text-decoration: none;
			cursor: pointer;
			background: transparent;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);

			&:hover:not(:disabled) {
				border-color: var(--mc-primary);
			}

			&:disabled {
				opacity: 0.6;
				cursor: default;
			}

			&.is-danger:hover:not(:disabled) {
				color: var(--mc-primary);
			}

			&.is-primary {
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}
		}

		.confirm {
			position: sticky;
			bottom: 1rem;
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			margin-top: 1.25rem;
			padding: 1rem 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-primary);
			border-radius: var(--mc-radius-lg);

			p {
				margin: 0;
			}
		}

		.confirm-actions {
			display: flex;
			gap: 0.5rem;
		}

		.error {
			padding: 0.75rem 1rem;
			margin-bottom: 1rem;
			color: var(--mc-primary);
			border: 1px solid var(--mc-primary);
			border-radius: var(--mc-radius-md);
		}

		.empty {
			color: var(--mc-text-muted);
		}

		.skeleton {
			height: 8rem;
			border-radius: var(--mc-radius-lg);
			background: var(--mc-card-bg);
		}

		.visually-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			margin: -1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
			border: 0;
		}
	`,
})
export class MusicCollectionAdminComponent {
	protected readonly store = inject(MusicCollectionAdminStore);

	protected readonly filters: { value: StatusFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'published', label: 'Published' },
		{ value: 'draft', label: 'Drafts' },
	];
}
