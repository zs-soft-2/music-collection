import { DatePipe, DecimalPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Button } from 'primeng/button';

import {
	CatalogBundleStatus,
	catalogBundleId,
	catalogBundleState,
} from '../../../data/catalog-bundle';
import { CatalogBundleAdminStore } from './catalog-bundle-admin.store';

/**
 * Admin: the catalog bundles the clients download in place of reading the
 * catalog document by document.
 *
 * Each row says how far behind the catalog its bundle has fallen — the
 * documents written and deleted since it was built, which every cold client
 * then reads one by one — and offers to build it again. The nightly run
 * keeps the showcase current; the genre and feature bundles were only ever
 * built by the scripts, and this is where an import can be followed up
 * without a terminal.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-catalog-bundle-admin',
	providers: [CatalogBundleAdminStore],
	imports: [...I18N_IMPORTS, Button, DatePipe, DecimalPipe],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'admin.bundles.title' | transloco }}</h1>
				<p>{{ 'admin.bundles.intro' | transloco }}</p>
			</div>
			<p-button
				[label]="'admin.bundles.recount' | transloco"
				icon="pi pi-refresh"
				severity="secondary"
				[loading]="store.isLoading()"
				[disabled]="!!store.rebuilding()"
				(onClick)="store.load()"
			></p-button>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading() && !store.bundles().length) {
			<p class="mc-form-note" role="status">
				{{ 'common.loading' | transloco }}
			</p>
		} @else if (store.bundles().length) {
			<p class="summary" role="status">
				@if (store.behindCount()) {
					{{
						'admin.bundles.behind-summary'
							| transloco: { count: store.behindCount() }
					}}
				} @else {
					{{ 'admin.bundles.all-current' | transloco }}
				}
				@if (store.checkedAt(); as checkedAt) {
					· {{ 'admin.bundles.checked-at' | transloco }}
					{{ checkedAt | date: 'HH:mm:ss' }}
				}
			</p>

			@for (section of sections(); track section.titleKey) {
				<section class="mc-card bundle-section">
					<h2>{{ section.titleKey | transloco }}</h2>
					<p class="mc-form-note">
						{{ section.introKey | transloco }}
					</p>

					<div class="mc-stacked-table">
						<table>
							<thead>
								<tr>
									<th scope="col">
										{{ 'admin.bundles.name' | transloco }}
									</th>
									<th scope="col">
										{{
											'admin.bundles.documents'
												| transloco
										}}
									</th>
									<th scope="col">
										{{ 'admin.bundles.built' | transloco }}
									</th>
									<th scope="col">
										{{ 'admin.bundles.since' | transloco }}
									</th>
									<th scope="col">
										<span class="visually-hidden">{{
											'admin.bundles.actions' | transloco
										}}</span>
									</th>
								</tr>
							</thead>
							<tbody>
								@for (
									bundle of section.rows;
									track id(bundle)
								) {
									<tr [attr.data-state]="state(bundle)">
										<th scope="row">
											@switch (bundle.kind) {
												@case ('guest') {
													{{
														'admin.bundles.guest-name'
															| transloco
													}}
													@if (bundle.week) {
														<small>{{
															bundle.week
														}}</small>
													}
												}
												@case ('genre') {
													{{ bundle.name }}
												}
												@default {
													<code>{{
														bundle.key
													}}</code>
												}
											}
											<span
												class="state"
												[attr.data-state]="
													state(bundle)
												"
												>{{
													'admin.bundles.state.' +
														state(bundle)
														| transloco
												}}</span
											>
										</th>
										<td
											[attr.data-label]="
												'admin.bundles.documents'
													| transloco
											"
										>
											{{ bundle.count | number }}
										</td>
										<td
											[attr.data-label]="
												'admin.bundles.built'
													| transloco
											"
										>
											@if (bundle.builtAt) {
												{{
													bundle.builtAt
														| date
															: 'yyyy-MM-dd HH:mm'
												}}
											} @else {
												—
											}
										</td>
										<td
											class="since"
											[attr.data-label]="
												'admin.bundles.since'
													| transloco
											"
										>
											@if (bundle.path) {
												{{
													'admin.bundles.changes'
														| transloco
															: {
																	changed:
																		(bundle.changed
																		| number),
																	deleted:
																		(bundle.deleted
																		| number),
															  }
												}}
											} @else {
												—
											}
										</td>
										<td class="mc-stacked-actions">
											@if (
												store.rebuilding() ===
												id(bundle)
											) {
												<p-button
													[label]="
														'admin.bundles.rebuilding'
															| transloco
													"
													size="small"
													[loading]="true"
												></p-button>
											} @else if (
												store.pendingRebuild() ===
												id(bundle)
											) {
												<p-button
													[label]="
														'admin.bundles.confirm'
															| transloco
																: {
																		reads:
																			(bundle.readCost
																			| number),
																  }
													"
													icon="pi pi-check"
													severity="warn"
													size="small"
													(onClick)="
														store.confirmRebuild()
													"
												></p-button>
												<p-button
													[label]="
														'admin.bundles.cancel'
															| transloco
													"
													severity="secondary"
													size="small"
													[text]="true"
													(onClick)="
														store.cancelRebuild()
													"
												></p-button>
											} @else {
												<p-button
													[label]="
														'admin.bundles.rebuild'
															| transloco
													"
													icon="pi pi-replay"
													[severity]="
														state(bundle) ===
														'current'
															? 'secondary'
															: 'primary'
													"
													size="small"
													[disabled]="
														!!store.rebuilding()
													"
													(onClick)="
														store.askRebuild(bundle)
													"
												></p-button>
											}

											@if (
												store.rebuilt()[id(bundle)];
												as done
											) {
												<small
													class="outcome"
													role="status"
												>
													{{
														'admin.bundles.rebuilt'
															| transloco
																: {
																		count:
																			(done
																				.result
																				.count
																			| number),
																		kb: kb(
																			done
																				.result
																				.bytes
																		),
																		seconds:
																			seconds(
																				done.tookMs
																			),
																  }
													}}
												</small>
											}
											@if (
												store.failures()[id(bundle)];
												as failure
											) {
												<small
													class="failure"
													role="alert"
													>{{ failure }}</small
												>
											}
										</td>
									</tr>
								}
							</tbody>
						</table>
					</div>
				</section>
			}
		}
	`,
	styles: `
		.summary {
			margin: 0 0 1rem;
			color: var(--mc-text-muted);
			font-size: 0.875rem;
		}

		.bundle-section {
			margin-bottom: 1.25rem;

			h2 {
				margin: 0 0 0.25rem;
				font-size: 1.0625rem;
			}
		}

		th small {
			margin-left: 0.375rem;
			color: var(--mc-text-muted);
			font-weight: 400;
		}

		.state {
			display: inline-block;
			margin-left: 0.5rem;
			padding: 0.0625rem 0.5rem;
			border-radius: 999px;
			font-size: 0.6875rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			background: var(--mc-surface-2);
			color: var(--mc-text-muted);

			&[data-state='behind'] {
				background: color-mix(
					in srgb,
					var(--mc-warning, orange) 20%,
					transparent
				);
				color: var(--mc-text);
			}

			&[data-state='reset'] {
				background: color-mix(
					in srgb,
					var(--mc-danger, crimson) 22%,
					transparent
				);
				color: var(--mc-text);
			}
		}

		.since {
			white-space: nowrap;
		}

		.outcome,
		.failure {
			display: block;
			margin-top: 0.375rem;
			font-size: 0.75rem;
		}

		.outcome {
			color: var(--mc-text-muted);
		}

		.failure,
		.error {
			color: var(--mc-danger, crimson);
		}
	`,
})
export class CatalogBundleAdminComponent {
	protected readonly store = inject(CatalogBundleAdminStore);

	protected readonly sections = computed(() => [
		{
			titleKey: 'admin.bundles.guest-title',
			introKey: 'admin.bundles.guest-intro',
			rows: this.store.guest(),
		},
		{
			titleKey: 'admin.bundles.genre-title',
			introKey: 'admin.bundles.genre-intro',
			rows: this.store.genres(),
		},
		{
			titleKey: 'admin.bundles.feature-title',
			introKey: 'admin.bundles.feature-intro',
			rows: this.store.features(),
		},
	]);

	protected id(bundle: CatalogBundleStatus): string {
		return catalogBundleId(bundle);
	}

	protected state(bundle: CatalogBundleStatus) {
		return catalogBundleState(bundle);
	}

	protected kb(bytes: number): string {
		return String(Math.max(1, Math.round(bytes / 1024)));
	}

	protected seconds(ms: number): string {
		return (ms / 1000).toFixed(1);
	}
}
