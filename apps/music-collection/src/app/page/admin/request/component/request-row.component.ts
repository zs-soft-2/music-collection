import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { EntityRequestVerdictKind } from '@music-collection/api';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { RequestRow } from '../request-admin.mapper';
import { RequestDraft } from '../request-admin.store';

/**
 * One request, decided field by field.
 *
 * Both values stand side by side on every row, even on a new entity where
 * the left one is empty: the admin is answering the same question each time —
 * should the catalog hold this instead of that — and a column that appears
 * and disappears makes that question look like two.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-request-row',
	imports: [...I18N_IMPORTS],
	template: `
		<article class="request" [attr.aria-labelledby]="'request-' + row().id">
			<header class="head">
				<div>
					<h3 [id]="'request-' + row().id">
						{{ row().subject }}
						<span class="kind">{{
							(row().operation === 'create'
								? 'ui.requestRow.new-entity'
								: 'ui.requestRow.change'
							) | transloco
						}}</span>
					</h3>
					<p class="meta">
						{{ row().entityType }} · {{ row().requesterName }} ·
						{{ row().requestedOn }}
						@if (row().decidedOn) {
							· {{ row().decidedOn }}
						}
					</p>
				</div>
				<span class="status" [attr.data-status]="row().status">{{
					row().status
				}}</span>
			</header>

			@if (row().note) {
				<p class="note">
					<span>{{ 'ui.requestRow.collector' | transloco }}</span>
					{{ row().note }}
				</p>
			}

			<table class="fields">
				<thead>
					<tr>
						<th scope="col">
							{{ 'ui.requestRow.field' | transloco }}
						</th>
						<th scope="col">
							{{ 'ui.requestRow.now' | transloco }}
						</th>
						<th scope="col">
							{{ 'ui.requestRow.asked' | transloco }}
						</th>
						<th scope="col">
							{{ 'ui.requestRow.reference' | transloco }}
						</th>
						<th scope="col">
							{{ 'ui.requestRow.decision' | transloco }}
						</th>
					</tr>
				</thead>
				<tbody>
					@for (field of row().fields; track field.field) {
						<tr>
							<th scope="row">{{ field.label }}</th>
							<td class="was">{{ field.before }}</td>
							<td class="asked">{{ field.after }}</td>
							<td class="reference">
								@if (field.reference; as reference) {
									@if (reference.url) {
										<a
											[href]="reference.url"
											target="_blank"
											rel="noopener"
											>{{ reference.label }}</a
										>
									} @else {
										{{ reference.label }}
									}
								} @else {
									<span class="none">{{
										'ui.requestRow.no-reference' | transloco
									}}</span>
								}
							</td>
							<td class="decision">
								@if (row().pending) {
									<div class="choice" role="group">
										<button
											type="button"
											class="chip"
											[attr.aria-pressed]="
												kindOf(field.field) ===
												'accepted'
											"
											[disabled]="busy()"
											(click)="
												verdict.emit({
													field: field.field,
													kind: 'accepted',
												})
											"
										>
											{{
												'ui.requestRow.accept'
													| transloco
											}}
										</button>
										<button
											type="button"
											class="chip"
											[attr.aria-pressed]="
												kindOf(field.field) ===
												'rejected'
											"
											[disabled]="busy()"
											(click)="
												verdict.emit({
													field: field.field,
													kind: 'rejected',
												})
											"
										>
											{{
												'ui.requestRow.reject'
													| transloco
											}}
										</button>
									</div>
									@if (kindOf(field.field) === 'rejected') {
										<input
											type="text"
											class="why"
											[value]="reasonOf(field.field)"
											[disabled]="busy()"
											[attr.placeholder]="
												'ui.requestRow.why-not'
													| transloco
											"
											(input)="
												reason.emit({
													field: field.field,
													reason: value($event),
												})
											"
										/>
									}
								} @else {
									<span
										class="verdict"
										[attr.data-verdict]="field.verdict"
										>{{
											(field.verdict === 'accepted'
												? 'ui.requestRow.accepted'
												: 'ui.requestRow.rejected'
											) | transloco
										}}</span
									>
									@if (field.reason) {
										<span class="why-not">{{
											field.reason
										}}</span>
									}
								}
							</td>
						</tr>
					}
				</tbody>
			</table>

			@if (row().pending) {
				<div class="deciding">
					<input
						type="text"
						class="admin-note"
						[value]="note()"
						[disabled]="busy()"
						[attr.placeholder]="
							'ui.requestRow.admin-note' | transloco
						"
						(input)="noteChange.emit(value($event))"
					/>
					<button
						type="button"
						class="primary"
						[disabled]="busy() || !canDecide()"
						(click)="decide.emit()"
					>
						{{
							(busy()
								? 'ui.requestRow.saving'
								: 'ui.requestRow.save-decision'
							) | transloco
						}}
					</button>
				</div>
				@if (!canDecide()) {
					<p class="hint">
						{{ 'ui.requestRow.decide-every-field' | transloco }}
					</p>
				}
			} @else {
				@if (row().adminNote) {
					<p class="note">
						<span>{{ 'ui.requestRow.admin' | transloco }}</span>
						{{ row().adminNote }}
					</p>
				}
				@if (row().appliedPath) {
					<p class="applied">
						{{ 'ui.requestRow.taken-in' | transloco }}
						<code>{{ row().appliedPath }}</code>
					</p>
				}
			}

			@if (error()) {
				<p class="error">{{ error()! | transloco }}</p>
			}
		</article>
	`,
	styles: `
		.request {
			padding: 1rem 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);
		}

		.head {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 1rem;
		}

		h3 {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.5rem;
			margin: 0;
			font-size: 1.05rem;
		}

		.kind,
		.meta {
			font-size: 0.85rem;
			font-weight: 400;
			color: var(--mc-text-muted);
		}

		.meta {
			margin: 0.25rem 0 0;
		}

		.status {
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--mc-text-muted);

			&[data-status='pending'] {
				color: var(--mc-accent);
			}

			&[data-status='rejected'] {
				color: var(--mc-status-bad, #b3261e);
			}
		}

		.note {
			margin: 0.75rem 0 0;
			font-size: 0.875rem;
			color: var(--mc-text-muted);

			span {
				margin-right: 0.375rem;
				font-weight: 600;
				color: var(--mc-text);
			}
		}

		.fields {
			width: 100%;
			margin-top: 0.75rem;
			border-collapse: collapse;
			font-size: 0.875rem;

			th,
			td {
				padding: 0.5rem 0.5rem 0.5rem 0;
				text-align: left;
				vertical-align: top;
				border-bottom: 1px solid var(--mc-border);
			}

			thead th {
				font-size: 0.75rem;
				text-transform: uppercase;
				letter-spacing: 0.04em;
				color: var(--mc-text-subtle);
			}

			tbody th {
				font-weight: 600;
				white-space: nowrap;
			}
		}

		.was {
			color: var(--mc-text-muted);
		}

		.reference .none {
			color: var(--mc-text-subtle);
		}

		.choice {
			display: flex;
			gap: 0.375rem;
		}

		.chip {
			padding: 0.25rem 0.625rem;
			font: inherit;
			font-size: 0.8125rem;
			color: var(--mc-text);
			background: transparent;
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
			cursor: pointer;

			&[aria-pressed='true'] {
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}

			&[disabled] {
				opacity: 0.6;
				cursor: default;
			}
		}

		.why,
		.admin-note {
			width: 100%;
			margin-top: 0.375rem;
			padding: 0.375rem 0.5rem;
			font: inherit;
			font-size: 0.8125rem;
			color: var(--mc-text);
			background: transparent;
			border: 1px solid var(--mc-border-strong);
			border-radius: 0.375rem;
		}

		.verdict {
			font-weight: 600;

			&[data-verdict='rejected'] {
				color: var(--mc-status-bad, #b3261e);
			}
		}

		.why-not {
			display: block;
			color: var(--mc-text-muted);
		}

		.deciding {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			margin-top: 0.75rem;
		}

		.admin-note {
			margin-top: 0;
		}

		.primary {
			padding: 0.5rem 1rem;
			font: inherit;
			font-weight: 600;
			color: var(--mc-on-primary);
			background: var(--mc-primary);
			border: 1px solid transparent;
			border-radius: 0.5rem;
			white-space: nowrap;
			cursor: pointer;

			&[disabled] {
				opacity: 0.6;
				cursor: default;
			}
		}

		.hint,
		.applied {
			margin: 0.5rem 0 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}

		.error {
			margin: 0.5rem 0 0;
			font-size: 0.875rem;
			color: var(--mc-status-bad, #b3261e);
		}
	`,
})
export class RequestRowComponent {
	public readonly row = input.required<RequestRow>();
	/** What the admin has decided so far, by field. */
	public readonly draft = input<RequestDraft>({});
	public readonly note = input<string>('');
	public readonly busy = input<boolean>(false);
	/** A translation key of what went wrong, if anything did. */
	public readonly error = input<string | null>(null);

	public readonly verdict = output<{
		field: string;
		kind: EntityRequestVerdictKind;
	}>();
	public readonly reason = output<{ field: string; reason: string }>();
	public readonly noteChange = output<string>();
	public readonly decide = output<void>();

	/**
	 * Whether the decision may be sent: every field answered, and every
	 * refusal with a reason the collector can read. The server refuses it
	 * again — this only keeps the admin from finding that out the hard way.
	 */
	public readonly canDecide = computed(() => {
		const draft = this.draft();

		return this.row().fields.every((field) => {
			const verdict = draft[field.field];

			return (
				!!verdict &&
				(verdict.kind === 'accepted' || !!verdict.reason.trim())
			);
		});
	});

	protected kindOf(field: string): EntityRequestVerdictKind | null {
		return this.draft()[field]?.kind ?? null;
	}

	protected reasonOf(field: string): string {
		return this.draft()[field]?.reason ?? '';
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}
}
