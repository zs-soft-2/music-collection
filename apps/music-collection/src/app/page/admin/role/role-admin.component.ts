import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Button } from 'primeng/button';

import { HOLDERS_UNREADABLE, ROLE_IN_USE } from '../../../data/role';
import { RoleAdminStore, RoleRow } from './role-admin.store';

/**
 * Admin: the roles there are.
 *
 * A role's line says how far it reaches into each part of the collection and
 * how many people hold it — the two things that decide whether touching it is
 * a small act or a large one. "12 permissions" says neither.
 *
 * The holder count is a link: a role is only interesting because of who
 * carries it, and the answer is one page away.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-role-admin',
	providers: [RoleAdminStore],
	imports: [...I18N_IMPORTS, RouterLink, Button],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'admin.role.title' | transloco }}</h1>
				<p>{{ 'admin.role.intro' | transloco }}</p>
			</div>
			<div class="mc-page-actions">
				<p-button
					[label]="'admin.role.add' | transloco"
					icon="pi pi-plus"
					(onClick)="add()"
				></p-button>
			</div>
		</header>

		@if (store.error(); as error) {
			<small class="error" role="alert">
				@if (error === inUse) {
					{{
						'admin.role.in-use'
							| transloco: { count: store.pendingHolders() ?? 0 }
					}}
				} @else if (error === unreadable) {
					{{ 'admin.role.holders-unreadable' | transloco }}
				} @else {
					{{ error }}
				}
			</small>
		}

		@if (store.isLoading()) {
			<p class="mc-form-note" role="status" aria-busy="true">
				{{ 'common.loading' | transloco }}
			</p>
		} @else if (!store.rows().length) {
			<p class="mc-form-note">{{ 'admin.role.empty' | transloco }}</p>
		} @else {
			<div class="mc-card">
				<div class="mc-table-tools">
					<span class="totals">{{
						'admin.role.count'
							| transloco: { count: store.rows().length }
					}}</span>
				</div>

				<div class="mc-stacked-table">
					<table>
						<thead>
							<tr>
								<th scope="col">
									{{ 'admin.role.name' | transloco }}
								</th>
								<th scope="col">
									{{ 'admin.role.reach' | transloco }}
								</th>
								<th scope="col">
									{{ 'admin.role.holders' | transloco }}
								</th>
								<th scope="col">
									<span class="visually-hidden">{{
										'admin.role.actions' | transloco
									}}</span>
								</th>
							</tr>
						</thead>
						<tbody>
							@for (row of store.rows(); track row.role.uid) {
								<tr>
									<th scope="row">
										<a
											[routerLink]="[
												'/admin/role/edit',
												row.role.uid
											]"
											>{{ row.role.name }}</a
										>
										<small class="id">{{
											row.role.uid
										}}</small>
										@if (row.role.description) {
											<small class="summary">{{
												row.role.description
											}}</small>
										}
									</th>

									<td
										class="reach"
										[attr.data-label]="
											'admin.role.reach' | transloco
										"
									>
										@if (row.isWildcard) {
											<strong>{{
												'admin.role.wildcard'
													| transloco
											}}</strong>
										} @else if (granted(row)) {
											@for (
												line of covered(row);
												track line.groupKey
											) {
												<span
													class="chip"
													[class.is-full]="
														line.granted ===
														line.total
													"
												>
													{{
														line.groupKey
															| transloco
													}}
													{{ line.granted }}/{{
														line.total
													}}
												</span>
											}
										} @else {
											{{
												'admin.role.no-permission'
													| transloco
											}}
										}
									</td>

									<td
										class="holders"
										[attr.data-label]="
											'admin.role.holders' | transloco
										"
									>
										@if (row.holders === null) {
											<span class="unknown">—</span>
										} @else if (row.holders) {
											<a
												[routerLink]="['/admin/user']"
												[queryParams]="{
													role: row.role.uid,
												}"
												>{{ row.holders }}</a
											>
										} @else {
											0
										}
									</td>

									<td class="mc-stacked-actions">
										@if (
											store.pendingDeletion()?.uid ===
											row.role.uid
										) {
											<p-button
												[label]="
													'admin.role.really-delete'
														| transloco
												"
												icon="pi pi-trash"
												severity="danger"
												size="small"
												[disabled]="!!row.holders"
												[loading]="store.isDeleting()"
												(onClick)="
													store.confirmDeletion()
												"
											></p-button>
											<p-button
												[label]="
													'admin.role.cancel'
														| transloco
												"
												severity="secondary"
												size="small"
												[text]="true"
												(onClick)="
													store.cancelDeletion()
												"
											></p-button>
										} @else {
											<a
												class="icon-link"
												[routerLink]="[
													'/admin/role/edit',
													row.role.uid
												]"
												[attr.aria-label]="
													'admin.role.edit'
														| transloco
												"
												><i
													class="pi pi-pencil"
													aria-hidden="true"
												></i
											></a>
											<a
												class="icon-link"
												routerLink="/admin/role/new"
												[queryParams]="{
													from: row.role.uid,
												}"
												[attr.aria-label]="
													'admin.role.clone'
														| transloco
												"
												><i
													class="pi pi-copy"
													aria-hidden="true"
												></i
											></a>
											<p-button
												icon="pi pi-trash"
												severity="danger"
												size="small"
												[rounded]="true"
												[text]="true"
												[ariaLabel]="
													'admin.role.delete'
														| transloco
												"
												(onClick)="
													store.askDeletion(row.role)
												"
											></p-button>
										}
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
			</div>
		}
	`,
	styles: `
		.error {
			display: block;
			margin-bottom: 1rem;
			color: var(--mc-status-bad);
		}

		.totals {
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		.id,
		.summary {
			display: block;
			margin-top: 0.125rem;
			color: var(--mc-text-muted);
			font-size: 0.75rem;
			font-weight: 400;
			white-space: normal;
		}

		.chip {
			display: inline-block;
			margin: 0 0.25rem 0.25rem 0;
			padding: 0.125rem 0.5rem;
			border: 1px solid var(--mc-border, #d9d9d9);
			border-radius: 999px;
			color: var(--mc-text-muted);
			font-size: 0.6875rem;
			white-space: nowrap;

			&.is-full {
				border-color: currentcolor;
				color: var(--mc-status-good, #2e7d32);
				font-weight: 600;
			}
		}

		.holders {
			font-variant-numeric: tabular-nums;
		}

		.unknown {
			color: var(--mc-text-muted);
		}

		.icon-link {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 2rem;
			height: 2rem;
			border-radius: 50%;
			color: var(--mc-text-muted);

			&:hover {
				background: var(--mc-surface-2, rgb(0 0 0 / 6%));
			}
		}

		/*
		 * The reach column is a row of chips, one per group of the catalog.
		 * The shared table keeps its cells on one line, which would put them
		 * all on one very wide row; qualified, because the plain class name
		 * loses to the table's own nowrap.
		 */
		.mc-stacked-table td.reach {
			white-space: normal;
		}
	`,
})
export class RoleAdminComponent {
	protected readonly store = inject(RoleAdminStore);
	protected readonly inUse = ROLE_IN_USE;
	protected readonly unreadable = HOLDERS_UNREADABLE;

	private readonly router = inject(Router);

	/**
	 * A button rather than a link, because that is what the rest of the admin
	 * puts in this corner. The rows offer the editor as a proper link, which
	 * is where opening a role in another tab actually comes up.
	 */
	protected add(): void {
		this.router.navigate(['/admin/role/new']);
	}

	/** Only the groups the role actually reaches into are worth a chip. */
	protected covered(row: RoleRow) {
		return row.coverage.filter((line) => line.granted > 0);
	}

	protected granted(row: RoleRow): number {
		return row.coverage.reduce((total, line) => total + line.granted, 0);
	}
}
