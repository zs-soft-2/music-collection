import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
	signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReleaseRequestRow } from '../release-request-admin.mapper';

/** One release request with its approval and rejection. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-request-row',
	imports: [RouterLink],
	template: `
		<article class="request" [attr.aria-labelledby]="'request-' + row().id">
			<header class="head">
				<div>
					<h3 [id]="'request-' + row().id">
						<a [routerLink]="['/album', row().albumId]">{{
							row().albumName
						}}</a>
						@if (row().artistName) {
							<span class="artist">{{ row().artistName }}</span>
						}
					</h3>
					<p class="meta">
						{{ row().requesterName }} · {{ row().requestedOn }}
						@if (row().decidedOn) {
							· decided {{ row().decidedOn }}
						}
					</p>
				</div>
				<span class="status" [attr.data-status]="row().status">{{
					row().status
				}}</span>
			</header>

			<p class="summary">
				@if (row().discogsUrl) {
					<a [href]="row().discogsUrl" target="_blank" rel="noopener"
						>{{ row().summary }}
						<i class="pi pi-external-link" aria-hidden="true"></i
					></a>
				} @else {
					{{ row().summary }}
				}
			</p>
			@if (row().note) {
				<p class="note"><span>Collector:</span> {{ row().note }}</p>
			}
			@if (row().adminNote) {
				<p class="note"><span>Admin:</span> {{ row().adminNote }}</p>
			}

			@if (error()) {
				<p class="error" role="alert">{{ error() }}</p>
			}

			@if (row().status === 'pending') {
				@if (rejecting()) {
					<label class="field">
						<span>Reason (shown to the collector, optional)</span>
						<textarea
							rows="2"
							maxlength="500"
							[value]="rejectNote()"
							(input)="rejectNote.set($any($event.target).value)"
						></textarea>
					</label>
					<div class="actions">
						<button
							type="button"
							class="text-button"
							[disabled]="busy()"
							(click)="rejecting.set(false)"
						>
							Cancel
						</button>
						<button
							type="button"
							class="danger-button"
							[disabled]="busy()"
							(click)="reject.emit(rejectNote().trim() || null)"
						>
							Reject request
						</button>
					</div>
				} @else {
					<div class="actions">
						@if (row().importable) {
							<button
								type="button"
								class="primary-button"
								[disabled]="busy()"
								(click)="approve.emit(null)"
							>
								<i
									class="pi pi-download"
									aria-hidden="true"
								></i>
								{{
									busy() ? 'Working…' : 'Import from Discogs'
								}}
							</button>
						}
						@if (row().catalogReleases.length) {
							<span class="link-release">
								<label
									class="visually-hidden"
									[for]="'release-' + row().id"
									>Catalog release</label
								>
								<select
									[id]="'release-' + row().id"
									[disabled]="busy()"
									(change)="
										releaseUid.set(
											$any($event.target).value
										)
									"
								>
									<option value="" [selected]="!releaseUid()">
										Link a catalog release…
									</option>
									@for (
										release of row().catalogReleases;
										track release.id
									) {
										<option
											[value]="release.id"
											[selected]="
												release.id === releaseUid()
											"
										>
											{{ release.label }}
										</option>
									}
								</select>
								<button
									type="button"
									class="secondary-button"
									[disabled]="busy() || !releaseUid()"
									(click)="approve.emit(releaseUid())"
								>
									Approve with it
								</button>
							</span>
						}
						<button
							type="button"
							class="text-button danger"
							[disabled]="busy()"
							(click)="rejecting.set(true)"
						>
							Reject
						</button>
					</div>
					@if (!row().importable && !row().catalogReleases.length) {
						<p class="hint">
							Add the release to the album in the admin, then link
							it here.
						</p>
					}
				}
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

			a {
				color: var(--mc-text);
			}
		}

		.artist,
		.meta {
			font-size: 0.85rem;
			font-weight: 400;
			color: var(--mc-text-muted);
		}

		.meta {
			margin: 0.25rem 0 0;
		}

		.status {
			flex: none;
			padding: 0.15rem 0.6rem;
			border-radius: 999px;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			border: 1px solid currentColor;

			&[data-status='pending'] {
				color: var(--mc-status-warn);
			}
			&[data-status='approved'] {
				color: var(--mc-status-ok);
			}
			&[data-status='rejected'] {
				color: var(--mc-status-bad);
			}
		}

		.summary {
			margin: 0.75rem 0 0;

			a {
				color: var(--mc-text);
			}

			i {
				font-size: 0.75rem;
				color: var(--mc-text-muted);
			}
		}

		.note {
			margin: 0.4rem 0 0;
			font-size: 0.9rem;
			color: var(--mc-text-muted);

			span {
				font-weight: 600;
			}
		}

		.error {
			margin: 0.75rem 0 0;
			padding: 0.5rem 0.75rem;
			color: var(--mc-status-bad);
			border: 1px solid var(--mc-status-bad);
			border-radius: var(--mc-radius-md);
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem 1rem;
			margin-top: 1rem;
		}

		.link-release {
			display: inline-flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		select,
		textarea {
			padding: 0.45rem 0.6rem;
			font: inherit;
			color: var(--mc-text);
			background: var(--mc-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
		}

		.field {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
			margin-top: 1rem;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		button {
			font: inherit;
			cursor: pointer;

			&:disabled {
				cursor: not-allowed;
				opacity: 0.6;
			}

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 2px;
			}
		}

		.primary-button,
		.secondary-button,
		.danger-button {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			height: 2.25rem;
			padding: 0 1rem;
			border-radius: var(--mc-radius-md);
			font-weight: 600;
		}

		.primary-button {
			border: 0;
			color: var(--mc-on-primary);
			background: var(--mc-primary);
		}

		.secondary-button {
			border: 1px solid var(--mc-border-strong);
			color: var(--mc-text);
			background: var(--mc-bg);
		}

		.danger-button {
			border: 0;
			color: #fff;
			background: var(--mc-status-bad);
		}

		.text-button {
			padding: 0;
			border: 0;
			font-weight: 600;
			color: var(--mc-primary);
			background: none;

			&.danger {
				color: var(--mc-status-bad);
			}
		}

		.hint {
			margin: 0.5rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-text-subtle);
		}
	`,
})
export class ReleaseRequestRowComponent {
	public readonly row = input.required<ReleaseRequestRow>();
	public readonly busy = input(false);
	public readonly error = input<string | null>(null);

	/** Approve: with a catalog release id, or `null` to import from Discogs. */
	public readonly approve = output<string | null>();
	/** Reject, with the reason for the collector. */
	public readonly reject = output<string | null>();

	protected readonly releaseUid = signal('');
	protected readonly rejecting = signal(false);
	protected readonly rejectNote = signal('');
}
