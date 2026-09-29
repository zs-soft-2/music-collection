import { combineLatest, map } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import {
	ADMIN_PERMISSION,
	ROLE_ID_TAKEN,
	ROLE_NAME_TAKEN,
	RoleFinding,
} from '../../../../data/role';
import { PermissionGridComponent } from '../component/permission-grid.component';
import { PermissionSummaryComponent } from '../component/permission-summary.component';
import { RoleEditStore } from './role-edit.store';

/** Write failures the page has a sentence of its own for. */
const WRITE_ERRORS: string[] = [ROLE_NAME_TAKEN, ROLE_ID_TAKEN];

/**
 * Admin: one role, written.
 *
 * Three things are on the page besides the grid, and each one answers a
 * question the grid cannot. The findings say what is wrong or merely odd about
 * the draft — including the combinations this database will accept and then
 * refuse to act on. The impact panel says what the save changes and how many
 * people it reaches. And the search narrows a hundred-odd checkboxes to the
 * handful the admin came for.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-role-edit',
	providers: [RoleEditStore],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		RouterLink,
		Button,
		Checkbox,
		InputText,
		Textarea,
		PermissionGridComponent,
		PermissionSummaryComponent,
	],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>
					@if (store.target().uid) {
						{{ 'admin.role.editing' | transloco }}
					} @else {
						{{ 'admin.role.adding' | transloco }}
					}
				</h1>
				@if (store.original(); as original) {
					<p>{{ original.name }} · <code>{{ original.uid }}</code></p>
				} @else if (store.target().from) {
					<p>
						{{
							'admin.role.copy-of'
								| transloco: { name: store.target().from }
						}}
					</p>
				}
			</div>
			<div class="mc-page-actions">
				<a class="back" routerLink="/admin/role">
					<i class="pi pi-arrow-left" aria-hidden="true"></i>
					{{ 'admin.role.back-to-list' | transloco }}
				</a>
			</div>
		</header>

		@if (store.error(); as error) {
			<small class="error" role="alert">{{ writeError(error) }}</small>
		}

		<form
			class="mc-form"
			[attr.aria-label]="'admin.role.editor' | transloco"
			(ngSubmit)="store.save()"
		>
			<section class="mc-form-section" aria-labelledby="role-identity">
				<h2 id="role-identity">{{ 'admin.role.identity' | transloco }}</h2>

				<div class="mc-form-grid">
					<div class="mc-field">
						<label for="role-name">{{
							'admin.role.name' | transloco
						}}</label>
						<input
							id="role-name"
							type="text"
							pInputText
							[value]="store.draft().name"
							[placeholder]="
								'admin.role.name-placeholder' | transloco
							"
							aria-describedby="role-name-hint"
							(input)="store.setName(value($event))"
						/>
						<small id="role-name-hint">
							@if (store.newRoleId(); as id) {
								{{ 'admin.role.id-hint' | transloco: { id } }}
							} @else if (store.original(); as original) {
								{{
									'admin.role.id-kept'
										| transloco: { id: original.uid }
								}}
							}
						</small>
					</div>

					<div class="mc-field is-wide">
						<label for="role-description">{{
							'admin.role.description' | transloco
						}}</label>
						<textarea
							id="role-description"
							pTextarea
							[rows]="2"
							[autoResize]="true"
							[value]="store.draft().description ?? ''"
							(input)="store.setDescription(value($event))"
						></textarea>
					</div>
				</div>
			</section>

			@if (store.findings().length) {
				<ul class="findings">
					@for (finding of store.findings(); track finding.code) {
						<li [class.is-error]="finding.severity === 'error'">
							<i
								class="pi"
								[class.pi-times-circle]="
									finding.severity === 'error'
								"
								[class.pi-exclamation-triangle]="
									finding.severity === 'warning'
								"
								aria-hidden="true"
							></i>
							<span>{{ sentence(finding) }}</span>
						</li>
					}
				</ul>
			}

			<section class="mc-form-section" aria-labelledby="role-permissions">
				<h2 id="role-permissions">
					{{ 'admin.role.permissions' | transloco }}
				</h2>

				<div class="wildcard">
					<p-checkbox
						inputId="role-wildcard"
						[binary]="true"
						[ngModel]="store.isWildcard()"
						[ngModelOptions]="{ standalone: true }"
						(onChange)="
							store.toggle({
								permissions: [admin],
								granted: $event.checked,
							})
						"
					></p-checkbox>
					<label for="role-wildcard">
						<strong>{{ 'admin.role.wildcard' | transloco }}</strong>
						<small>{{
							'admin.role.wildcard-hint' | transloco
						}}</small>
					</label>
				</div>

				<div class="mc-table-tools">
					<input
						type="search"
						pInputText
						[value]="store.search()"
						[placeholder]="
							'admin.role.search-permissions' | transloco
						"
						[attr.aria-label]="
							'admin.role.search-permissions' | transloco
						"
						(input)="store.setSearch(value($event))"
					/>
				</div>

				<mc-permission-grid
					[groups]="store.visibleGroups()"
					[permissions]="store.draft().permissions"
					[disabled]="store.isWildcard()"
					(toggled)="store.toggle($event)"
				></mc-permission-grid>

				@if (store.extraPermissions().length) {
					<div class="extra">
						<h3>{{ 'admin.role.extra' | transloco }}</h3>
						<small>{{ 'admin.role.extra-hint' | transloco }}</small>
						<ul>
							@for (
								permission of store.extraPermissions();
								track permission
							) {
								<li>
									<code>{{ permission }}</code>
									<p-button
										icon="pi pi-times"
										severity="danger"
										size="small"
										[rounded]="true"
										[text]="true"
										[ariaLabel]="
											'admin.role.remove-permission'
												| transloco
										"
										(onClick)="
											store.toggle({
												permissions: [permission],
												granted: false,
											})
										"
									></p-button>
								</li>
							}
						</ul>
					</div>
				}
			</section>

			<section class="mc-form-section" aria-labelledby="role-impact">
				<h2 id="role-impact">{{ 'admin.role.impact' | transloco }}</h2>

				<p class="impact-line">
					@if (store.holders(); as holders) {
						{{ 'admin.role.reaches' | transloco: { count: holders } }}
					} @else if (store.holders() === 0) {
						{{ 'admin.role.reaches-nobody' | transloco }}
					} @else if (store.original()) {
						{{ 'admin.role.reaches-unknown' | transloco }}
					} @else {
						{{ 'admin.role.reaches-new' | transloco }}
					}
				</p>

				@if (store.diff().added.length) {
					<div class="impact-block is-added">
						<h3>
							{{
								'admin.role.will-add'
									| transloco
										: { count: store.diff().added.length }
							}}
						</h3>
						<mc-permission-summary
							[permissions]="store.diff().added"
						></mc-permission-summary>
					</div>
				}

				@if (store.diff().removed.length) {
					<div class="impact-block is-removed">
						<h3>
							{{
								'admin.role.will-remove'
									| transloco
										: { count: store.diff().removed.length }
							}}
						</h3>
						<mc-permission-summary
							[permissions]="store.diff().removed"
						></mc-permission-summary>
					</div>
				}

				@if (!store.diff().added.length && !store.diff().removed.length) {
					<p class="mc-form-note">
						{{ 'admin.role.no-change' | transloco }}
					</p>
				}
			</section>

			<div class="mc-form-actions">
				<p-button
					[label]="'admin.role.cancel' | transloco"
					severity="secondary"
					[outlined]="true"
					[disabled]="store.isSaving()"
					(onClick)="store.cancel()"
				></p-button>
				<p-button
					type="submit"
					[label]="'admin.role.save' | transloco"
					icon="pi pi-check"
					[disabled]="!store.canSave() || store.isSaving()"
					[loading]="store.isSaving()"
				></p-button>
			</div>
		</form>
	`,
	styles: `
		.error {
			display: block;
			margin-bottom: 1rem;
			color: var(--mc-status-bad);
		}

		.back {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			font-size: 0.8125rem;
		}

		.findings {
			margin: 0 0 1.5rem;
			padding: 0;
			list-style: none;

			li {
				display: flex;
				align-items: flex-start;
				gap: 0.5rem;
				padding: 0.375rem 0;
				color: var(--mc-text-muted);
				font-size: 0.8125rem;
				line-height: 1.5;
			}

			li.is-error {
				color: var(--mc-status-bad);
				font-weight: 600;
			}

			i {
				margin-top: 0.125rem;
			}
		}

		.wildcard {
			display: flex;
			align-items: flex-start;
			gap: 0.5rem;
			margin-bottom: 1rem;

			label {
				display: flex;
				flex-direction: column;
				gap: 0.125rem;
				font-size: 0.8125rem;
			}

			small {
				color: var(--mc-text-muted);
			}
		}

		.extra {
			margin-top: 1rem;

			h3 {
				margin: 0;
				font-size: 0.875rem;
			}

			small {
				color: var(--mc-text-muted);
				font-size: 0.75rem;
			}

			ul {
				margin: 0.5rem 0 0;
				padding: 0;
				list-style: none;
			}

			li {
				display: flex;
				align-items: center;
				gap: 0.25rem;
			}
		}

		.impact-line {
			margin: 0 0 0.75rem;
			font-size: 0.8125rem;
		}

		.impact-block {
			margin-bottom: 1rem;
			padding-left: 0.75rem;
			border-left: 3px solid var(--mc-border, #d9d9d9);

			h3 {
				margin: 0 0 0.375rem;
				font-size: 0.8125rem;
			}

			&.is-added {
				border-left-color: var(--mc-status-good, #2e7d32);
			}

			&.is-removed {
				border-left-color: var(--mc-status-bad, #b3261e);
			}
		}
	`,
})
export class RoleEditComponent {
	protected readonly store = inject(RoleEditStore);
	protected readonly admin = ADMIN_PERMISSION;

	private readonly route = inject(ActivatedRoute);
	private readonly transloco = inject(TranslocoService);

	public constructor() {
		// Read off the route rather than bound as inputs: the application
		// does not run the router's input binding, and turning it on for one
		// page would change how every other routed component is fed.
		this.store.open(
			combineLatest([
				this.route.paramMap,
				this.route.queryParamMap,
			]).pipe(
				map(([params, query]) => ({
					uid: params.get('roleId'),
					from: query.get('from'),
				}))
			)
		);
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	/**
	 * What went wrong with the write. The two the page knows about are the
	 * ones another admin can cause between opening the editor and pressing
	 * save; anything else is shown as it arrived, because a key name on
	 * screen would be worse than a raw message.
	 */
	protected writeError(error: string): string {
		return WRITE_ERRORS.includes(error)
			? this.transloco.translate(`admin.role.write-failed.${error}`)
			: error;
	}

	/**
	 * A finding as a sentence. The parameters differ per finding — a resource
	 * label is itself a key — so they are resolved here rather than in half a
	 * dozen template branches.
	 */
	protected sentence(finding: RoleFinding): string {
		const params: Record<string, string | number> = {
			...(finding.params ?? {}),
		};

		if (typeof params['labelKey'] === 'string') {
			params['resource'] = this.transloco.translate(params['labelKey']);
		}

		return this.transloco.translate(
			`admin.role.finding.${finding.code}`,
			params
		);
	}
}
