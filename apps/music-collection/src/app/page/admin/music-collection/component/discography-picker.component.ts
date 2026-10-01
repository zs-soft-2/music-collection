import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	DiscographyCandidate,
	DiscographyCreation,
} from '@music-collection/domain/music-collection/api';

/**
 * Opens a band's discography: the studio albums, and everything else they
 * put out beside them.
 *
 * The bands come from the catalog, not from a list anyone keeps — every band
 * the catalog holds two studio albums of is here, richest first. A band one
 * rule already follows stays in the list, greyed, with the name of that
 * rule: "taken, by this" is the answer to why it cannot be opened again,
 * and a band silently missing from the list would not be.
 *
 * It knows nothing about writing; the page it stands on does that.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-discography-picker',
	imports: [...I18N_IMPORTS],
	template: `
		<section class="picker" aria-labelledby="discography-title">
			<header class="picker-head">
				<div>
					<h2 id="discography-title">
						{{ 'ui.discographyPicker.title' | transloco }}
					</h2>
					<p class="hint">
						{{ 'ui.discographyPicker.hint' | transloco }}
					</p>
				</div>
				<button type="button" class="button" (click)="closed.emit()">
					{{ 'ui.discographyPicker.close' | transloco }}
				</button>
			</header>

			@if (created(); as pair) {
				<p class="created" role="status">
					<i class="pi pi-check" aria-hidden="true"></i>
					{{
						'ui.discographyPicker.opened'
							| transloco: { band: pair.artistName }
					}}
					<strong>{{ pair.main.name }}</strong>
					{{ 'ui.discographyPicker.and' | transloco }}
					<strong>{{ pair.companion.name }}</strong>
					@if (pair.companion.status === 'draft') {
						<span class="draft-note">
							{{
								'ui.discographyPicker.companionIsDraft'
									| transloco
							}}
						</span>
					}
				</p>
			}

			<label class="search">
				<i class="pi pi-search" aria-hidden="true"></i>
				<input
					type="search"
					[value]="query()"
					[placeholder]="
						'ui.discographyPicker.searchBands' | transloco
					"
					[attr.aria-label]="
						'ui.discographyPicker.searchBands' | transloco
					"
					(input)="onQuery($event)"
				/>
			</label>

			@if (!candidates().length) {
				<p class="empty">
					@if (query().trim()) {
						{{
							'ui.discographyPicker.noBand'
								| transloco: { query: query().trim() }
						}}
					} @else {
						{{ 'ui.discographyPicker.noCandidate' | transloco }}
					}
				</p>
			} @else {
				<ul class="candidates">
					@for (
						candidate of candidates();
						track candidate.artistUid
					) {
						<li
							class="candidate"
							[class.is-taken]="candidate.coveredBy"
						>
							<div class="band">
								<strong>{{ candidate.artistName }}</strong>
								<span class="counts">
									{{
										'ui.discographyPicker.counts'
											| transloco
												: {
														studio: candidate.studioAlbumCount,
														other: candidate.companionAlbumCount,
												  }
									}}
								</span>
								@if (candidate.coveredBy; as coveredBy) {
									<span class="taken">
										{{
											'ui.discographyPicker.alreadyFollowed'
												| transloco
													: { collection: coveredBy }
										}}
									</span>
								}
							</div>

							<button
								type="button"
								class="button is-primary"
								[disabled]="
									!!candidate.coveredBy ||
									busyArtistUid() !== null
								"
								(click)="picked.emit(candidate)"
							>
								@if (busyArtistUid() === candidate.artistUid) {
									{{
										'ui.discographyPicker.opening'
											| transloco
									}}
								} @else {
									{{
										'ui.discographyPicker.open' | transloco
									}}
								}
							</button>
						</li>
					}
				</ul>

				@if (total() > candidates().length) {
					<p class="more">
						{{
							'ui.discographyPicker.more'
								| transloco
									: {
											shown: candidates().length,
											total: total(),
									  }
						}}
					</p>
				}
			}
		</section>
	`,
	styles: `
		.picker {
			margin-bottom: 1.25rem;
			padding: 1rem 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-primary);
			border-radius: var(--mc-radius-lg);
		}

		.picker-head {
			display: flex;
			flex-wrap: wrap;
			align-items: flex-start;
			justify-content: space-between;
			gap: 1rem;

			h2 {
				margin: 0;
				font-size: 1.05rem;
			}
		}

		.hint {
			margin: 0.25rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.created {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.35rem;
			margin: 0.9rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-text);

			.pi {
				color: var(--mc-accent);
			}
		}

		.draft-note {
			color: var(--mc-text-muted);
		}

		.search {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin-top: 0.9rem;
			padding: 0.4rem 0.7rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);

			&:focus-within {
				border-color: var(--mc-primary);
			}

			input {
				flex: 1;
				font: inherit;
				color: var(--mc-text);
				background: transparent;
				border: 0;

				&:focus {
					outline: none;
				}
			}
		}

		.candidates {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
			margin: 0.9rem 0 0;
			padding: 0;
			list-style: none;
		}

		.candidate {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			padding: 0.5rem 0.75rem;
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);

			&.is-taken {
				opacity: 0.65;
				border-style: dashed;
			}
		}

		.band {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.5rem;
			min-width: 0;
		}

		.counts,
		.taken {
			font-size: 0.8rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;
		}

		.more,
		.empty {
			margin: 0.75rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.button {
			padding: 0.4rem 0.9rem;
			font: inherit;
			font-size: 0.85rem;
			color: var(--mc-text);
			cursor: pointer;
			background: transparent;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);

			&:hover:not(:disabled) {
				border-color: var(--mc-primary);
			}

			&:disabled {
				opacity: 0.6;
				cursor: default;
			}

			&.is-primary {
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}
		}
	`,
})
export class DiscographyPickerComponent {
	/** The bands on offer — already narrowed down to what is shown. */
	public readonly candidates = input.required<DiscographyCandidate[]>();
	/** Every band worth a discography, however many of them are shown. */
	public readonly total = input.required<number>();
	public readonly query = input.required<string>();
	/** The band whose pair is being written right now. */
	public readonly busyArtistUid = input.required<string | null>();
	/** The pair just opened, so the page can say what it created. */
	public readonly created = input.required<DiscographyCreation | null>();

	public readonly queryChanged = output<string>();
	public readonly picked = output<DiscographyCandidate>();
	public readonly closed = output<void>();

	protected onQuery(event: Event): void {
		this.queryChanged.emit((event.target as HTMLInputElement).value);
	}
}
