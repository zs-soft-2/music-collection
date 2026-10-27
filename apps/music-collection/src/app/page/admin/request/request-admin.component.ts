import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ReleaseRequestRowComponent } from './component/release-request-row.component';
import { RequestRowComponent } from './component/request-row.component';
import { ReleaseRequestRow } from './release-request.mapper';
import { RequestRow, StatusFilter } from './request-admin.mapper';
import { RequestAdminStore } from './request-admin.store';
import { KindFilter, RequestFeedEntry } from './request-feed';

/**
 * Admin: everything the collectors ask of the catalog, in one list.
 *
 * A collector asks two different things — take this pressing in, hold this
 * field differently — and each is decided its own way, so each keeps its own
 * card. What they share is when they were asked, which is the order an admin
 * works in, so the list is one and the kind is a label and a filter.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-request-admin',
	providers: [RequestAdminStore],
	imports: [...I18N_IMPORTS, RequestRowComponent, ReleaseRequestRowComponent],
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
			[attr.aria-label]="'ui.requestAdmin.filter-by-kind' | transloco"
		>
			@for (kind of kinds; track kind.value) {
				<button
					type="button"
					class="chip kind"
					[attr.aria-pressed]="store.kindFilter() === kind.value"
					(click)="store.setKindFilter(kind.value)"
				>
					@if (kind.icon) {
						<i class="pi {{ kind.icon }}" aria-hidden="true"></i>
					}
					{{ kind.labelKey | transloco }}
					<span class="count">{{
						store.kindCounts()[kind.value]
					}}</span>
				</button>
			}
		</div>

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
		} @else if (store.entries().length) {
			<ul class="requests">
				@for (entry of store.entries(); track entry.id) {
					<li>
						<p class="kind-tag" [attr.data-kind]="entry.kind">
							<i
								class="pi"
								[class.pi-file-edit]="entry.kind === 'catalog'"
								[class.pi-inbox]="entry.kind === 'release'"
								aria-hidden="true"
							></i>
							{{
								(entry.kind === 'catalog'
									? 'ui.requestAdmin.kind-catalog'
									: 'ui.requestAdmin.kind-release'
								) | transloco
							}}
						</p>

						@if (catalogRow(entry); as row) {
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
						}
						@if (releaseRow(entry); as row) {
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
						}
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
			margin-bottom: 0.6rem;

			&:last-of-type {
				margin-bottom: 1.25rem;
			}
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

		/* The kind is the coarser cut, so it reads as the quieter row. */
		.chip.kind {
			font-size: 0.8rem;

			i {
				font-size: 0.75rem;
			}
		}

		.count {
			font-variant-numeric: tabular-nums;
			opacity: 0.8;
		}

		.requests {
			display: flex;
			flex-direction: column;
			gap: 1rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.kind-tag {
			display: flex;
			align-items: center;
			gap: 0.35rem;
			margin: 0 0 0.3rem 0.25rem;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);

			&[data-kind='release'] {
				color: var(--mc-accent);
			}
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

	protected readonly kinds: {
		value: KindFilter;
		labelKey: string;
		icon: string | null;
	}[] = [
		{ value: 'all', labelKey: 'ui.requestAdmin.kind-all', icon: null },
		{
			value: 'catalog',
			labelKey: 'ui.requestAdmin.kind-catalog',
			icon: 'pi-file-edit',
		},
		{
			value: 'release',
			labelKey: 'ui.requestAdmin.kind-release',
			icon: 'pi-inbox',
		},
	];

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

	/**
	 * The entry as the card that can show it, or nothing. The two kinds are
	 * told apart here rather than in the template, where narrowing a union
	 * across a binding is more trouble than it is worth.
	 */
	protected catalogRow(entry: RequestFeedEntry): RequestRow | null {
		return entry.kind === 'catalog' ? entry.row : null;
	}

	protected releaseRow(entry: RequestFeedEntry): ReleaseRequestRow | null {
		return entry.kind === 'release' ? entry.row : null;
	}
}
