import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CompletenessGroup } from '../../admin-dashboard.mapper';

/**
 * Adatminőség: entitás-típusonként egy-egy mérősáv mezőnként, hogy a rekordok
 * hány százalékán van kitöltve. A sáv a kitöltött részt mutatja, mellette a
 * hiányzók száma áll, így a szám hover nélkül is olvasható. Az „Open list”
 * csak ott jelenik meg, ahol a típusnak van admin listája.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-completeness-meters',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		@for (group of groups(); track group.labelKey) {
			<section
				class="group"
				[attr.aria-label]="group.labelKey | transloco"
			>
				<header class="group-head">
					<h3>
						{{ group.labelKey | transloco }}
						<span class="group-total">{{ group.total }}</span>
					</h3>
					@if (group.route) {
						<a class="more" [routerLink]="['..', group.route]">
							{{ 'ui.completenessMeters.open-list' | transloco }}
							<i class="pi pi-arrow-right" aria-hidden="true"></i>
						</a>
					}
				</header>

				<ul class="meters">
					@for (row of group.rows; track row.labelKey) {
						<li
							class="row"
							[attr.aria-label]="
								'admin.meter.row'
									| transloco
										: {
												field: row.labelKey | transloco,
												share: row.share,
												missing: row.missing,
										  }
							"
						>
							<span class="label" aria-hidden="true">{{
								row.labelKey | transloco
							}}</span>
							<span class="track" aria-hidden="true">
								<span
									class="fill"
									[style.width.%]="row.share"
								></span>
							</span>
							<span class="value" aria-hidden="true">
								<strong>{{ row.share }}%</strong>
								@if (row.missing) {
									<span class="missing"
										>{{ row.missing }} missing</span
									>
								} @else {
									<span class="done">
										<i
											class="pi pi-check"
											aria-hidden="true"
										></i>
										{{
											'ui.completenessMeters.complete'
												| transloco
										}}
									</span>
								}
							</span>
						</li>
					}
				</ul>
			</section>
		}
	`,
	styles: `
		:host {
			display: block;
		}

		ul {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.group + .group {
			margin-top: 1.5rem;
		}

		.group-head {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: 1rem;
			margin-bottom: 0.75rem;

			h3 {
				display: flex;
				align-items: baseline;
				gap: 0.5rem;
				margin: 0;
				font-size: 0.9375rem;
				font-weight: 600;
			}
		}

		.group-total {
			font-size: 0.8rem;
			font-weight: 500;
			color: var(--mc-text-subtle);
			font-variant-numeric: tabular-nums;
		}

		.more {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
			text-decoration: none;

			i {
				font-size: 0.7rem;
			}

			&:hover {
				color: var(--mc-text);
			}
		}

		.meters {
			display: flex;
			flex-direction: column;
			gap: 0.6rem;
		}

		.row {
			display: grid;
			grid-template-columns: minmax(6.5rem, 9rem) minmax(0, 1fr) 9.5rem;
			gap: 0.75rem;
			align-items: center;
		}

		.label {
			overflow: hidden;
			font-size: 0.85rem;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		/* Track: a light step of the fill's hue. */
		.track {
			height: 8px;
			overflow: hidden;
			background: color-mix(
				in srgb,
				var(--mc-chart) 18%,
				var(--mc-card-bg)
			);
			border-radius: 4px;
		}

		.fill {
			display: block;
			height: 100%;
			background: var(--mc-chart);
			border-radius: 4px;
		}

		.value {
			display: flex;
			align-items: baseline;
			gap: 0.5rem;
			font-size: 0.8rem;
			font-variant-numeric: tabular-nums;

			strong {
				min-width: 2.75rem;
				font-weight: 600;
				text-align: right;
			}
		}

		.missing {
			color: var(--mc-text-muted);
		}

		.done {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			color: var(--mc-status-ok);

			i {
				font-size: 0.7rem;
			}
		}

		@media (max-width: 520px) {
			.row {
				grid-template-columns: minmax(0, 1fr) auto;
			}

			.track {
				grid-column: 1 / -1;
				grid-row: 2;
			}
		}
	`,
})
export class CompletenessMetersComponent {
	public readonly data = input.required<CompletenessGroup[]>();

	protected readonly groups = computed(() =>
		this.data().map((group) => ({
			...group,
			rows: group.checks.map((check) => ({
				...check,
				share: group.total
					? Math.floor(
							((group.total - check.missing) / group.total) * 100
						)
					: 100,
			})),
		}))
	);
}
