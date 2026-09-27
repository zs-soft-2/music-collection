import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { RequestRowComponent } from './component/request-row.component';
import { StatusFilter } from './request-admin.mapper';
import { RequestAdminStore } from './request-admin.store';

/** Admin: what the collectors ask the catalog to take in. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-request-admin',
	providers: [RequestAdminStore],
	imports: [...I18N_IMPORTS, RequestRowComponent],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'ui.requestAdmin.requests' | transloco }}</h1>
				<p>{{ 'ui.requestAdmin.what-collectors-ask' | transloco }}</p>
			</div>
		</header>

		<div
			class="filters"
			role="group"
			[attr.aria-label]="'ui.requestAdmin.filter-by-status' | transloco"
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

		@if (store.loading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">{{
					'ui.requestAdmin.loading-requests' | transloco
				}}</span>
			</div>
		} @else if (store.rows().length) {
			<ul class="requests">
				@for (row of store.rows(); track row.id) {
					<li>
						<mc-request-row
							[row]="row"
							[draft]="store.drafts()[row.id] ?? {}"
							[note]="store.adminNotes()[row.id] ?? ''"
							[busy]="store.busyId() === row.id"
							[error]="store.errors()[row.id] ?? null"
							(verdict)="
								store.setVerdict({
									requestId: row.id,
									field: $event.field,
									kind: $event.kind,
								})
							"
							(reason)="
								store.setReason({
									requestId: row.id,
									field: $event.field,
									reason: $event.reason,
								})
							"
							(noteChange)="
								store.setAdminNote({
									requestId: row.id,
									note: $event,
								})
							"
							(decide)="store.decide(row.id)"
						/>
					</li>
				}
			</ul>
		} @else {
			<p class="empty">
				{{ 'ui.requestAdmin.no-requests-here' | transloco }}
			</p>
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

		.requests {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.empty {
			color: var(--mc-text-muted);
		}

		.skeleton {
			height: 8rem;
			border-radius: var(--mc-radius-lg);
			background: var(--mc-card-bg);
		}
	`,
})
export class RequestAdminComponent {
	protected readonly store = inject(RequestAdminStore);

	protected readonly filters: { value: StatusFilter; labelKey: string }[] = [
		{ value: 'pending', labelKey: 'admin.filter.pending' },
		{ value: 'approved', labelKey: 'admin.filter.approved' },
		{
			value: 'partially-approved',
			labelKey: 'admin.filter.partially-approved',
		},
		{ value: 'rejected', labelKey: 'admin.filter.rejected' },
		{ value: 'all', labelKey: 'admin.filter.all' },
	];
}
