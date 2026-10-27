import { map } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Role, User } from '@music-collection/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';

import { ADMIN_PERMISSION } from '../../../data/role';
import { userName } from '../../../data/user-role';
import { PermissionSummaryComponent } from '../role/component/permission-summary.component';
import { UserAdminStore, WOULD_LOCK_OUT } from './user-admin.store';

/**
 * Admin: who holds which role.
 *
 * A row is a person, and what it shows is what their user document says: the
 * roles they hold by the names the permission sync will match. Opening a row
 * asks the server what those roles added up to — the same document the rules
 * read — because that, and not the sum of the ticks, is what the person can
 * actually do.
 *
 * The roles are picked, never typed. A permission is granted by a role and
 * nothing else; a page that let an admin write a permission straight onto a
 * person would leave two ways to grant the same thing, and the second one is
 * always the one nobody remembers to take away.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-user-admin',
	providers: [UserAdminStore],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		RouterLink,
		Button,
		Checkbox,
		InputText,
		PermissionSummaryComponent,
	],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'admin.user.title' | transloco }}</h1>
				<p>{{ 'admin.user.intro' | transloco }}</p>
			</div>
			<div class="mc-page-actions">
				<p-button
					[label]="'admin.user.resync' | transloco"
					icon="pi pi-refresh"
					severity="secondary"
					[outlined]="true"
					[loading]="store.isResyncing()"
					(onClick)="store.resync()"
				></p-button>
			</div>
		</header>

		@if (store.error(); as error) {
			<small class="user-error" role="alert">
				@if (error === lockOut) {
					{{ 'admin.user.would-lock-out' | transloco }}
				} @else {
					{{ error }}
				}
			</small>
		}

		@if (store.resynced(); as resynced) {
			<small class="user-note" role="status">{{
				'admin.user.resynced' | transloco: resynced
			}}</small>
		}

		@if (store.isLoading()) {
			<p class="mc-form-note" role="status" aria-busy="true">
				{{ 'common.loading' | transloco }}
			</p>
		} @else {
			<div class="mc-card">
				<div class="mc-table-tools">
					<input
						type="search"
						pInputText
						[value]="store.search()"
						[placeholder]="'admin.user.search' | transloco"
						[attr.aria-label]="'admin.user.search' | transloco"
						(input)="store.setSearch(value($event))"
					/>
					@if (store.roleFilter(); as filter) {
						<span class="user-filter">
							{{
								'admin.user.filtered-by'
									| transloco
										: {
												name:
													store.filteredRole()
														?.name ?? filter,
											}
							}}
							<a
								routerLink="."
								[queryParams]="{ role: null }"
								queryParamsHandling="merge"
								[attr.aria-label]="
									'admin.user.clear-filter' | transloco
								"
								>&times;</a
							>
						</span>
					}
					<span class="user-totals">{{
						'admin.user.count'
							| transloco: { count: store.rows().length }
					}}</span>
				</div>

				@if (!store.rows().length) {
					<p class="mc-form-note">
						{{ 'admin.user.empty' | transloco }}
					</p>
				} @else {
					<div class="mc-stacked-table">
						<table>
							<thead>
								<tr>
									<th scope="col">
										{{ 'admin.user.person' | transloco }}
									</th>
									<th scope="col">
										{{ 'admin.user.roles' | transloco }}
									</th>
									<th scope="col">
										<span class="visually-hidden">{{
											'admin.user.actions' | transloco
										}}</span>
									</th>
								</tr>
							</thead>
							<tbody>
								@for (row of store.rows(); track row.user.uid) {
									<tr>
										<th scope="row">
											{{ name(row.user) }}
											@if (row.user.email) {
												<small class="user-email">{{
													row.user.email
												}}</small>
											}
											<small class="user-uid">{{
												row.user.uid
											}}</small>
										</th>
										<td
											class="user-role-list"
											[attr.data-label]="
												'admin.user.roles' | transloco
											"
										>
											@if (
												store.editor()?.uid ===
												row.user.uid
											) {
												<div class="user-role-picker">
													@for (
														role of store.roles();
														track role.uid
													) {
														<span
															class="user-role-option"
														>
															<p-checkbox
																[binary]="true"
																[ngModel]="
																	store.holds(
																		role
																	)
																"
																[ngModelOptions]="{
																	standalone: true,
																}"
																[ariaLabel]="
																	role.name
																"
																(onChange)="
																	store.toggleRole(
																		role,
																		$event.checked
																	)
																"
															></p-checkbox>
															<span>
																{{ role.name }}
																@if (
																	wildcard(
																		role
																	)
																) {
																	<strong>{{
																		'admin.user.full-access'
																			| transloco
																	}}</strong>
																}
															</span>
														</span>
													}
												</div>
											} @else if (row.roles.length) {
												{{ names(row.roles) }}
											} @else {
												{{
													'admin.user.no-role'
														| transloco
												}}
											}

											@if (row.dangling.length) {
												<small
													class="user-dangling"
													>{{
														'admin.user.dangling'
															| transloco
																: {
																		names: row.dangling.join(
																			', '
																		),
																	}
													}}</small
												>
											}

											@if (
												store.opened() === row.user.uid
											) {
												<div class="user-effective">
													@if (
														store.isEffectiveLoading()
													) {
														<small>{{
															'common.loading'
																| transloco
														}}</small>
													} @else if (
														store.effective();
														as effective
													) {
														<small class="heading">{{
															'admin.user.effective'
																| transloco
																	: {
																			count: effective
																				.permissions
																				.length,
																		}
														}}</small>
														<mc-permission-summary
															[permissions]="
																effective.permissions
															"
														></mc-permission-summary>
													} @else {
														<small>{{
															'admin.user.no-effective'
																| transloco
														}}</small>
													}
												</div>
											}
										</td>
										<td class="mc-stacked-actions">
											@if (
												store.editor()?.uid ===
												row.user.uid
											) {
												<p-button
													[label]="
														'admin.user.save'
															| transloco
													"
													icon="pi pi-check"
													size="small"
													[disabled]="
														!store.keepsMyAccess() ||
														store.isSaving()
													"
													[loading]="store.isSaving()"
													(onClick)="store.save()"
												></p-button>
												<p-button
													[label]="
														'admin.user.cancel'
															| transloco
													"
													severity="secondary"
													size="small"
													[text]="true"
													(onClick)="store.cancel()"
												></p-button>
											} @else {
												<p-button
													icon="pi pi-pencil"
													severity="secondary"
													size="small"
													[rounded]="true"
													[text]="true"
													[ariaLabel]="
														'admin.user.edit-roles'
															| transloco
													"
													(onClick)="
														store.edit(row.user)
													"
												></p-button>
												@if (
													store.opened() ===
													row.user.uid
												) {
													<p-button
														icon="pi pi-eye-slash"
														severity="secondary"
														size="small"
														[rounded]="true"
														[text]="true"
														[ariaLabel]="
															'admin.user.hide-permissions'
																| transloco
														"
														(onClick)="
															store.close()
														"
													></p-button>
												} @else {
													<p-button
														icon="pi pi-eye"
														severity="secondary"
														size="small"
														[rounded]="true"
														[text]="true"
														[ariaLabel]="
															'admin.user.show-permissions'
																| transloco
														"
														(onClick)="
															store.open(
																row.user.uid
															)
														"
													></p-button>
												}
											}
										</td>
									</tr>
								}
							</tbody>
						</table>
					</div>
				}
			</div>
		}
	`,
	styles: `
		.user-error {
			display: block;
			margin-bottom: 1rem;
			color: var(--mc-status-bad);
		}

		.user-note {
			display: block;
			margin-bottom: 1rem;
			color: var(--mc-text-muted);
		}

		.user-filter {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			padding: 0.125rem 0.5rem;
			border: 1px solid var(--mc-border, #d9d9d9);
			border-radius: 999px;
			font-size: 0.75rem;

			a {
				text-decoration: none;
			}
		}

		.user-totals {
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		.user-email,
		.user-uid {
			display: block;
			margin-top: 0.125rem;
			color: var(--mc-text-muted);
			font-size: 0.75rem;
			font-weight: 400;
			white-space: normal;
		}

		.user-role-picker {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;
		}

		.user-role-option {
			display: flex;
			align-items: center;
			gap: 0.375rem;
			font-size: 0.8125rem;

			strong {
				margin-left: 0.25rem;
				color: var(--mc-text-muted);
				font-size: 0.6875rem;
				text-transform: uppercase;
			}
		}

		.user-dangling {
			display: block;
			margin-top: 0.25rem;
			color: var(--mc-status-bad);
			font-size: 0.75rem;
			white-space: normal;
		}

		.user-effective {
			margin-top: 0.5rem;

			.heading {
				display: block;
				margin-bottom: 0.375rem;
				color: var(--mc-text-muted);
			}
		}

		/*
		 * The roles cell carries a picker, a list of names and, when it is
		 * open, every effective permission — all of which the shared table
		 * would keep on one line. Qualified, because the plain class name
		 * loses to the table's own nowrap.
		 */
		.mc-stacked-table td.user-role-list {
			white-space: normal;
		}
	`,
})
export class UserAdminComponent {
	protected readonly store = inject(UserAdminStore);
	protected readonly lockOut = WOULD_LOCK_OUT;

	private readonly route = inject(ActivatedRoute);

	/**
	 * The role the list is narrowed to, straight off the query string: the
	 * role page links here to answer "who holds this one?", and the answer
	 * should survive being bookmarked.
	 */
	private readonly roleFilter = toSignal(
		this.route.queryParamMap.pipe(map((query) => query.get('role')))
	);

	public constructor() {
		effect(() => this.store.setRoleFilter(this.roleFilter() ?? null));
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	/** What to call the person: their name, failing that their email. */
	protected name(user: User): string {
		return userName(user);
	}

	protected names(roles: Role[]): string {
		return roles.map((role) => role.name).join(', ');
	}

	protected wildcard(role: Role): boolean {
		return (role.permissions ?? []).includes(ADMIN_PERMISSION);
	}
}
