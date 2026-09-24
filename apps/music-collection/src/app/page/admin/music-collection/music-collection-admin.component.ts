import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	MusicCollectionAdminStore,
	StatusFilter,
} from './music-collection-admin.store';

/** Admin: the abstract collections — the rules a badge is measured against. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-music-collection-admin',
	providers: [MusicCollectionAdminStore],
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'ui.musicCollectionAdmin.collections' | transloco }}</h1>
				<p>
					{{
						'ui.musicCollectionAdmin.sets-of-records-defined'
							| transloco
					}}
				</p>
			</div>
			<div class="mc-page-actions">
				<a class="button is-primary" [routerLink]="['edit', 0]">
					{{ 'ui.musicCollectionAdmin.add-collection' | transloco }}
				</a>
			</div>
		</header>

		<div
			class="filters"
			role="group"
			[attr.aria-label]="
				'ui.musicCollectionAdmin.filter-by-status' | transloco
			"
		>
			@for (filter of filters; track filter.value) {
				<button
					type="button"
					class="chip"
					[attr.aria-pressed]="store.statusFilter() === filter.value"
					(click)="store.setStatusFilter(filter.value)"
				>
					{{ filter.labelKey | transloco }}
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
				<span class="visually-hidden">{{
					'ui.musicCollectionAdmin.loading-collections' | transloco
				}}</span>
			</div>
		} @else if (!store.visibleRows().length) {
			<p class="empty">
				{{
					'ui.musicCollectionAdmin.no-collection-here-yet' | transloco
				}}
			</p>
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
								<strong>{{ row.total }}</strong>
								{{
									'ui.musicCollectionAdmin.records'
										| transloco
								}}
							</span>
							<span
								class="points"
								[class.is-derived]="row.derivedPoints"
								[title]="
									row.derivedPoints
										? 'From the rule — no curated score'
										: 'Set by the curator'
								"
							>
								<strong>{{ row.points }}</strong>
								{{ 'ui.musicCollectionAdmin.pts' | transloco }}
							</span>
						</div>

						<div class="actions">
							<a
								class="button"
								[routerLink]="['edit', row.uid]"
								>{{
									'ui.musicCollectionAdmin.edit' | transloco
								}}</a
							>
							<button
								type="button"
								class="button is-danger"
								[disabled]="store.busyUid() === row.uid"
								(click)="store.askDeletion(row)"
							>
								{{
									'ui.musicCollectionAdmin.delete' | transloco
								}}
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
					{{ 'ui.musicCollectionAdmin.delete2' | transloco }}
					<strong>{{ pending.name }}</strong
					>{{
						'ui.musicCollectionAdmin.whoever-earned-its-badge'
							| transloco
					}}
				</p>
				<div class="confirm-actions">
					<button
						type="button"
						class="button"
						(click)="store.cancelDeletion()"
					>
						{{ 'ui.musicCollectionAdmin.cancel' | transloco }}
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

		.points {
			font-size: 0.85rem;
			color: var(--mc-accent);
			font-variant-numeric: tabular-nums;

			&.is-derived {
				color: var(--mc-text-muted);
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

	protected readonly filters: { value: StatusFilter; labelKey: string }[] = [
		{ value: 'all', labelKey: 'admin.filter.all' },
		{ value: 'published', labelKey: 'admin.filter.published' },
		{ value: 'draft', labelKey: 'admin.filter.drafts' },
	];
}
