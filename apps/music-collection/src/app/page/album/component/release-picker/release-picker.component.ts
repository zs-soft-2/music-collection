import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	afterNextRender,
	effect,
	input,
	output,
	viewChild,
} from '@angular/core';

import { FormatBadgeComponent } from '../../../../shared/music-ui';
import { ReleaseOptionView } from '../../album.mapper';

/**
 * Modal list of the album's catalog releases: the collector picks the pressing
 * they own and a copy of it is added to their collection.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-picker',
	imports: [FormatBadgeComponent],
	template: `
		<dialog
			#dialog
			class="picker"
			aria-labelledby="release-picker-title"
			[attr.aria-busy]="adding()"
			(close)="closed.emit()"
		>
			<header class="picker-header">
				<div>
					<p class="eyebrow">Add to collection</p>
					<h2 id="release-picker-title">{{ albumTitle() }}</h2>
				</div>
				<button
					type="button"
					class="close"
					aria-label="Close"
					(click)="close()"
				>
					<i class="pi pi-times" aria-hidden="true"></i>
				</button>
			</header>

			<p class="lead">Which pressing do you have?</p>

			@if (error()) {
				<p class="error" role="alert">
					Could not add it to your collection: {{ error() }}
				</p>
			}

			@if (loading()) {
				<div class="skeleton" role="status" aria-busy="true">
					<span class="visually-hidden">Loading releases…</span>
				</div>
			} @else if (releases().length) {
				<ul class="releases">
					@for (release of releases(); track release.id) {
						<li>
							<button
								type="button"
								class="release"
								[disabled]="adding()"
								(click)="picked.emit(release.id)"
							>
								<mc-format-badge
									[format]="release.format"
									[weight]="release.weight"
								/>
								<span class="details">
									@if (release.labelName) {
										<span>{{ release.labelName }}</span>
									}
									@if (release.country) {
										<span>{{ release.country }}</span>
									}
									@if (release.year) {
										<span>{{ release.year }}</span>
									}
								</span>
								@if (release.editions.length) {
									<span class="editions">
										@for (
											edition of release.editions;
											track edition
										) {
											<span class="edition">{{
												edition
											}}</span>
										}
									</span>
								}
								<span class="action">
									@if (release.owned) {
										<span class="owned">
											<i
												class="pi pi-check"
												aria-hidden="true"
											></i>
											In your collection
										</span>
									}
									<i
										class="pi pi-plus"
										aria-hidden="true"
									></i>
									<span class="visually-hidden">
										{{
											release.owned
												? 'Add another copy'
												: 'Add'
										}}
									</span>
								</span>
							</button>
						</li>
					}
				</ul>
			} @else {
				<p class="empty">
					No release of this album is in the catalog yet.
				</p>
			}
		</dialog>
	`,
	styles: `
		.picker {
			width: min(40rem, calc(100vw - 2rem));
			max-height: min(40rem, calc(100vh - 2rem));
			padding: 1.5rem;
			color: var(--mc-text);
			background: var(--mc-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-lg);
			box-shadow: var(--mc-shadow-menu);
		}

		.picker::backdrop {
			background: rgb(0 0 0 / 0.6);
		}

		.picker-header {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 1rem;

			h2 {
				margin: 0;
				font-family: var(--mc-font-display);
				font-size: 2rem;
				font-weight: 400;
				line-height: 1.05;
			}
		}

		.eyebrow {
			margin: 0 0 0.25rem;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-primary);
		}

		.close {
			display: grid;
			flex: none;
			place-items: center;
			width: 2.75rem;
			height: 2.75rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			background: var(--mc-card-bg);
			color: var(--mc-text);
			cursor: pointer;

			&:hover {
				background: var(--mc-card-bg-hover);
			}
		}

		.lead {
			margin: 1rem 0;
			color: var(--mc-text-muted);
		}

		.error {
			margin: 0 0 1rem;
			padding: 0.6rem 0.8rem;
			color: var(--mc-status-bad);
			border: 1px solid var(--mc-status-bad);
			border-radius: var(--mc-radius-md);
		}

		.releases {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.release {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 1.25rem;
			align-items: center;
			width: 100%;
			padding: 0.75rem 1rem;
			font: inherit;
			text-align: left;
			color: var(--mc-text);
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			cursor: pointer;
			transition: border-color var(--mc-duration-fast) ease;

			&:hover:not(:disabled) {
				background: var(--mc-card-bg-hover);
				border-color: var(--mc-primary);
			}

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 2px;
			}

			&:disabled {
				cursor: progress;
				opacity: 0.6;
			}
		}

		.details {
			display: flex;
			flex-wrap: wrap;
			gap: 0.25rem 1rem;
			font-size: 0.9rem;

			span + span::before {
				margin-right: 1rem;
				content: '·';
				color: var(--mc-text-subtle);
			}
		}

		.editions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.3rem;
		}

		.edition {
			padding: 0.1rem 0.45rem;
			font-size: 0.65rem;
			font-weight: 700;
			text-transform: uppercase;
			color: var(--mc-on-accent);
			background: var(--mc-accent);
			border-radius: var(--mc-radius-sm);
		}

		.action {
			display: inline-flex;
			align-items: center;
			gap: 0.75rem;
			margin-left: auto;
			color: var(--mc-primary);
		}

		.owned {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--mc-text-muted);
		}

		.empty {
			margin: 0;
			color: var(--mc-text-muted);
		}

		.skeleton {
			height: 3.25rem;
			border-radius: var(--mc-radius-md);
			background: var(--mc-card-bg);
		}
	`,
})
export class ReleasePickerComponent {
	public readonly albumTitle = input.required<string>();
	public readonly releases = input.required<ReleaseOptionView[]>();
	public readonly loading = input(false);
	public readonly adding = input(false);
	public readonly error = input<string | null>(null);

	/** The id of the release picked. */
	public readonly picked = output<string>();
	/** Closed by the button, Escape or the page. */
	public readonly closed = output<void>();

	private readonly dialog =
		viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

	public constructor() {
		// Shown only while open; open it modally once rendered.
		afterNextRender(() => this.dialog().nativeElement.showModal());

		// Escape must not close the dialog halfway through an add.
		effect((onCleanup) => {
			const dialog = this.dialog().nativeElement;
			const adding = this.adding();
			const onCancel = (event: Event) => {
				if (adding) {
					event.preventDefault();
				}
			};
			dialog.addEventListener('cancel', onCancel);
			onCleanup(() => dialog.removeEventListener('cancel', onCancel));
		});
	}

	protected close(): void {
		if (!this.adding()) {
			this.dialog().nativeElement.close();
		}
	}
}
