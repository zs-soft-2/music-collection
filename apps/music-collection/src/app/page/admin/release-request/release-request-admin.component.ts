import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ReleaseRequestRowComponent } from './component/release-request-row.component';
import { StatusFilter } from './release-request-admin.mapper';
import { ReleaseRequestAdminStore } from './release-request-admin.store';

/** Admin: the collectors' release requests, pending ones first. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-request-admin',
	providers: [ReleaseRequestAdminStore],
	imports: [ReleaseRequestRowComponent],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>Release requests</h1>
				<p>
					Pressings the collectors own but the catalog is missing.
					Approving adds the release to the catalog and the copy to
					the collector's collection.
				</p>
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

		@if (store.loading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">Loading requests…</span>
			</div>
		} @else if (store.rows().length) {
			<ul class="requests">
				@for (row of store.rows(); track row.id) {
					<li>
						<mc-release-request-row
							[row]="row"
							[busy]="store.busyId() === row.id"
							[error]="store.errors()[row.id] ?? null"
							(approve)="
								store.approve({
									id: row.id,
									releaseUid: $event,
								})
							"
							(reject)="
								store.reject({ id: row.id, note: $event })
							"
						/>
					</li>
				}
			</ul>
		} @else {
			<p class="empty">No requests here.</p>
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
export class ReleaseRequestAdminComponent {
	protected readonly store = inject(ReleaseRequestAdminStore);

	protected readonly filters: { value: StatusFilter; label: string }[] = [
		{ value: 'pending', label: 'Pending' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'all', label: 'All' },
	];
}
