import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';

import {
	PERMISSION_ACTIONS,
	PermissionAction,
	PermissionGroup,
	PermissionResource,
	toPermission,
} from '../../../../data/role';

/** A group with only the columns its own resources need. */
interface GridGroup extends PermissionGroup {
	actions: PermissionAction[];
}

/** What a click asks the store to grant or take away. */
export interface PermissionToggle {
	permissions: string[];
	granted: boolean;
}

/**
 * The permissions of a role as a grid: a row per thing in the collection, a
 * column per action.
 *
 * That is what a permission is — an action on a resource, `create` +
 * `ArtistEntity` — so the grid is not decoration, it is the shape of the data.
 * A flat list of a hundred identifiers answers "is `updateReleaseEntity`
 * ticked?"; a row answers the question an admin actually arrives with, which
 * is "what may this role do with releases?".
 *
 * It emits whole sets rather than single permissions so that a row, a group
 * and one box are the same operation to whoever holds the draft.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-permission-grid',
	imports: [...I18N_IMPORTS, FormsModule, Button, Checkbox],
	template: `
		@for (group of grid(); track group.labelKey) {
			<div class="group" [class.is-muted]="disabled()">
				<div class="group-head">
					<div>
						<h3>{{ group.labelKey | transloco }}</h3>
						<small>{{ group.hintKey | transloco }}</small>
					</div>
					<div class="group-actions">
						<p-button
							[label]="'admin.role.all' | transloco"
							severity="secondary"
							size="small"
							[text]="true"
							[disabled]="disabled()"
							(onClick)="toggleGroup(group, true)"
						></p-button>
						<p-button
							[label]="'admin.role.none' | transloco"
							severity="secondary"
							size="small"
							[text]="true"
							[disabled]="disabled()"
							(onClick)="toggleGroup(group, false)"
						></p-button>
					</div>
				</div>

				<div class="mc-stacked-table grid">
					<table>
						<thead>
							<tr>
								<th scope="col">
									{{ 'admin.role.resource-column' | transloco }}
								</th>
								@for (action of group.actions; track action) {
									<th scope="col">
										{{
											'admin.role.action.' + action
												| transloco
										}}
									</th>
								}
								<th scope="col">
									{{ 'admin.role.whole-row' | transloco }}
								</th>
							</tr>
						</thead>
						<tbody>
							@for (
								resource of group.resources;
								track resource.resource
							) {
								<tr>
									<th scope="row">
										{{ resource.labelKey | transloco }}
									</th>
									@for (
										action of group.actions;
										track action
									) {
										<td
											[attr.data-label]="
												'admin.role.action.' + action
													| transloco
											"
										>
											@if (
												resource.actions.includes(
													action
												)
											) {
												<p-checkbox
													[binary]="true"
													[disabled]="disabled()"
													[ngModel]="
														granted(
															action,
															resource
														)
													"
													[ngModelOptions]="{
														standalone: true,
													}"
													[ariaLabel]="
														(resource.labelKey
															| transloco) +
														' — ' +
														('admin.role.action.' +
															action | transloco)
													"
													(onChange)="
														emit(
															[
																permission(
																	action,
																	resource
																)
															],
															$event.checked
														)
													"
												></p-checkbox>
											}
										</td>
									}
									<td
										[attr.data-label]="
											'admin.role.whole-row' | transloco
										"
									>
										<p-checkbox
											[binary]="true"
											[disabled]="disabled()"
											[ngModel]="whole(resource)"
											[ngModelOptions]="{
												standalone: true,
											}"
											[ariaLabel]="
												(resource.labelKey
													| transloco) +
												' — ' +
												('admin.role.whole-row'
													| transloco)
											"
											(onChange)="
												emit(
													names(resource),
													$event.checked
												)
											"
										></p-checkbox>
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
			</div>
		} @empty {
			<p class="mc-form-note">{{ 'admin.role.no-match' | transloco }}</p>
		}
	`,
	styles: `
		.group {
			margin-bottom: 1.5rem;

			&.is-muted {
				opacity: 0.5;
			}
		}

		.group-head {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.5rem;

			h3 {
				margin: 0;
				font-size: 0.875rem;
			}

			small {
				color: var(--mc-text-muted);
				font-size: 0.75rem;
			}
		}

		.group-actions {
			display: flex;
			gap: 0.25rem;
		}

		/*
		 * The action columns hold one checkbox each and nothing else, so they
		 * get no more room than that: left to share the width evenly, four of
		 * them squeezed the resource name into a column too narrow to read.
		 * Below the stacked table's breakpoint the rows become cards and the
		 * widths stop applying on their own.
		 */
		.grid td {
			width: 1%;
			text-align: center;
		}

		.grid th[scope='row'] {
			width: auto;
			white-space: normal;
		}
	`,
})
export class PermissionGridComponent {
	/** The catalog to draw, already narrowed by whatever search is on. */
	public readonly groups = input.required<PermissionGroup[]>();
	/** The permissions the role being written carries. */
	public readonly permissions = input.required<string[]>();
	/** Drawn but not clickable — what the wildcard does to the grid. */
	public readonly disabled = input<boolean>(false);

	public readonly toggled = output<PermissionToggle>();

	/**
	 * The groups with the columns each one actually needs: a group whose
	 * resources are only ever viewed gets one column, not four empty ones.
	 */
	protected grid(): GridGroup[] {
		return this.groups().map((group) => ({
			...group,
			actions: PERMISSION_ACTIONS.filter((action) =>
				group.resources.some((resource) =>
					resource.actions.includes(action)
				)
			),
		}));
	}

	protected permission(
		action: PermissionAction,
		resource: PermissionResource
	): string {
		return toPermission(action, resource.resource);
	}

	/** Every permission the resource offers — its whole row. */
	protected names(resource: PermissionResource): string[] {
		return resource.actions.map((action) =>
			this.permission(action, resource)
		);
	}

	protected granted(
		action: PermissionAction,
		resource: PermissionResource
	): boolean {
		return this.permissions().includes(this.permission(action, resource));
	}

	protected whole(resource: PermissionResource): boolean {
		return this.names(resource).every((permission) =>
			this.permissions().includes(permission)
		);
	}

	protected toggleGroup(group: GridGroup, granted: boolean): void {
		this.emit(
			group.resources.flatMap((resource) => this.names(resource)),
			granted
		);
	}

	protected emit(permissions: string[], granted: boolean): void {
		this.toggled.emit({ granted, permissions });
	}
}
