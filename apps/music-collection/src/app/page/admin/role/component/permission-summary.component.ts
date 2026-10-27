import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	groupPermissions,
	hasWildcard,
	unknownPermissions,
} from '../../../../data/role';

/**
 * A list of permissions read back as sentences.
 *
 * Wherever a permission is shown that the reader did not just tick — the
 * effective permissions the server worked out for a person, the difference a
 * save is about to make — it arrives as a bare identifier. Forty of those in a
 * row is not information. Sorted into the groups and rows of the catalog it
 * reads as "Catalog · Artist: create, update", which is the same fact in a
 * form somebody can check against what they meant.
 *
 * The wildcard and anything the catalog does not know are called out
 * separately, because neither is a row of the grid: one outranks every row,
 * the other belongs to no row at all.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-permission-summary',
	imports: [...I18N_IMPORTS],
	template: `
		@if (wildcard()) {
			<p class="wildcard">
				<strong>{{ 'admin.role.wildcard' | transloco }}</strong>
				<small>{{ 'admin.role.wildcard-hint' | transloco }}</small>
			</p>
		}

		@for (group of groups(); track group.groupKey) {
			<div class="group">
				<h4>{{ group.groupKey | transloco }}</h4>
				<ul>
					@for (line of group.lines; track line.labelKey) {
						<li>
							<span class="resource">{{
								line.labelKey | transloco
							}}</span>
							<span class="actions">
								@for (
									action of line.actions;
									track action;
									let last = $last
								) {
									{{ 'admin.role.action.' + action | transloco
									}}{{ last ? '' : ', ' }}
								}
							</span>
						</li>
					}
				</ul>
			</div>
		}

		@if (unknown().length) {
			<div class="group">
				<h4>{{ 'admin.role.extra' | transloco }}</h4>
				<ul class="codes">
					@for (permission of unknown(); track permission) {
						<li><code>{{ permission }}</code></li>
					}
				</ul>
			</div>
		}

		@if (!wildcard() && !groups().length && !unknown().length) {
			<p class="empty">{{ emptyKey() | transloco }}</p>
		}
	`,
	styles: `
		.wildcard {
			margin: 0 0 0.5rem;

			small {
				display: block;
				color: var(--mc-text-muted);
				font-size: 0.75rem;
			}
		}

		.group {
			margin-bottom: 0.75rem;

			h4 {
				margin: 0 0 0.25rem;
				color: var(--mc-text-muted);
				font-size: 0.6875rem;
				font-weight: 700;
				letter-spacing: 0.04em;
				text-transform: uppercase;
			}

			ul {
				margin: 0;
				padding: 0;
				list-style: none;
			}

			li {
				display: flex;
				flex-wrap: wrap;
				gap: 0.375rem;
				font-size: 0.8125rem;
				line-height: 1.5;
			}
		}

		.resource {
			font-weight: 600;

			&::after {
				content: ':';
			}
		}

		.actions {
			color: var(--mc-text-muted);
		}

		.codes code {
			font-size: 0.75rem;
		}

		.empty {
			margin: 0;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}
	`,
})
export class PermissionSummaryComponent {
	public readonly permissions = input.required<string[]>();
	/** What to say when there is nothing to show. */
	public readonly emptyKey = input<string>('admin.role.no-permission');

	protected wildcard(): boolean {
		return hasWildcard(this.permissions());
	}

	protected groups() {
		return groupPermissions(this.permissions());
	}

	protected unknown(): string[] {
		return unknownPermissions(this.permissions()).filter(
			(permission) => permission !== 'ADMIN'
		);
	}
}
