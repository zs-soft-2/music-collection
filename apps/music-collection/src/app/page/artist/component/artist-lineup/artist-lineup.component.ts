import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from '@angular/core';

import { LineupMember, LineupView } from '../../artist.mapper';

/** Guests shown before "Show all guests". */
const GUEST_PREVIEW = 12;

/**
 * A band's line-up: members with their instruments and years, each with a
 * time bar across the band's years on record, and the guest musicians.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-lineup',
	template: `
		@let view = lineup();

		@if (view.members.length) {
			<ul class="members">
				@for (member of view.members; track member.musicianUid) {
					<li class="member" [class.active]="member.active">
						<div class="who">
							<span class="name">{{ member.name }}</span>
							@if (member.instruments.length) {
								<span class="instruments">{{
									member.instruments.join(', ')
								}}</span>
							}
						</div>

						<div class="when">
							<span class="years">
								@if (member.years) {
									{{ member.years }}
								} @else {
									Years unknown
								}
							</span>
							@if (member.albumCount) {
								<span class="albums">
									{{ member.albumCount }}
									{{
										member.albumCount === 1
											? 'album'
											: 'albums'
									}}
								</span>
							}
						</div>

						@if (bar(member); as position) {
							<div class="track" aria-hidden="true">
								<span
									class="bar"
									[style.left.%]="position.left"
									[style.width.%]="position.width"
								></span>
							</div>
						}
					</li>
				}
			</ul>

			@if (view.span) {
				<div class="axis" aria-hidden="true">
					<span>{{ view.span.from }}</span>
					<span>{{ view.span.to }}</span>
				</div>
			}
		}

		@if (view.guests.length) {
			<h3 class="guests-title">Guest musicians</h3>
			<ul class="guests">
				@for (guest of visibleGuests(); track guest.musicianUid) {
					<li class="guest">
						<span class="name">{{ guest.name }}</span>
						@if (guest.instruments.length) {
							<span class="instruments">{{
								guest.instruments.join(', ')
							}}</span>
						}
						@if (guest.years) {
							<span class="years">{{ guest.years }}</span>
						}
					</li>
				}
			</ul>
			@if (view.guests.length > guestPreview) {
				<button
					type="button"
					class="text-button"
					[attr.aria-expanded]="showAllGuests()"
					(click)="showAllGuests.set(!showAllGuests())"
				>
					{{
						showAllGuests()
							? 'Show fewer guests'
							: 'Show all ' + view.guests.length + ' guests'
					}}
				</button>
			}
		}
	`,
	styles: `
		:host {
			display: block;
		}

		.members,
		.guests {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.member {
			display: grid;
			grid-template-columns: minmax(0, 1.2fr) minmax(9rem, 0.6fr) minmax(
					0,
					1.2fr
				);
			gap: 0.4rem 1.25rem;
			align-items: center;
			padding: 0.7rem 0;
			border-bottom: 1px solid var(--mc-border);
		}

		.who,
		.when {
			display: flex;
			flex-direction: column;
			gap: 0.1rem;
			min-width: 0;
		}

		.name {
			font-weight: 600;
		}

		.instruments {
			font-size: 0.82rem;
			color: var(--mc-text-muted);
		}

		.years {
			font-size: 0.9rem;
			font-variant-numeric: tabular-nums;
		}

		.member.active .years {
			font-weight: 600;
		}

		.albums {
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
		}

		/* Time bar across the band's years on record. */
		.track {
			position: relative;
			height: 10px;
			background: rgba(255, 255, 255, 0.05);
			border-radius: 999px;
		}

		.bar {
			position: absolute;
			top: 0;
			bottom: 0;
			min-width: 10px;
			background: var(--mc-text-subtle);
			border-radius: 999px;
		}

		.member.active .bar {
			background: var(--mc-chart);
		}

		.axis {
			display: grid;
			grid-template-columns: minmax(0, 1.2fr) minmax(9rem, 0.6fr) minmax(
					0,
					1.2fr
				);
			gap: 0 1.25rem;
			margin-top: 0.35rem;
			font-size: 0.72rem;
			color: var(--mc-text-subtle);
			font-variant-numeric: tabular-nums;
		}

		.axis span:first-child {
			grid-column: 3;
			grid-row: 1;
		}

		.axis span:last-child {
			grid-column: 3;
			grid-row: 1;
			justify-self: end;
		}

		.guests-title {
			margin: 1.75rem 0 0.6rem;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
		}

		.guests {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
			gap: 0.5rem 1.5rem;
		}

		.guest {
			display: flex;
			flex-direction: column;
			min-width: 0;
			padding: 0.4rem 0;
			border-bottom: 1px solid var(--mc-border);
		}

		.guest .years {
			font-size: 0.75rem;
			color: var(--mc-text-subtle);
		}

		.text-button {
			margin-top: 0.75rem;
			padding: 0;
			font: inherit;
			font-size: 0.9rem;
			font-weight: 600;
			color: var(--mc-accent);
			text-decoration: underline;
			cursor: pointer;
			background: none;
			border: 0;
		}

		.text-button:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 3px;
		}

		@media (max-width: 720px) {
			.member {
				grid-template-columns: minmax(0, 1fr) auto;
			}

			.track {
				grid-column: 1 / -1;
			}

			.when {
				align-items: flex-end;
				text-align: right;
			}

			.axis {
				display: none;
			}
		}
	`,
})
export class ArtistLineupComponent {
	public readonly lineup = input.required<LineupView>();

	protected readonly guestPreview = GUEST_PREVIEW;
	protected readonly showAllGuests = signal(false);

	protected readonly visibleGuests = computed(() => {
		const guests = this.lineup().guests;
		return this.showAllGuests() ? guests : guests.slice(0, GUEST_PREVIEW);
	});

	/** Position of a member's years on the band's time bar, in percent. */
	protected bar(
		member: LineupMember
	): { left: number; width: number } | null {
		const span = this.lineup().span;
		if (!span || member.from === null) {
			return null;
		}
		const total = Math.max(span.to - span.from, 1);
		const end = member.active ? span.to : (member.to ?? member.from);

		return {
			left: ((member.from - span.from) / total) * 100,
			width: ((end - member.from) / total) * 100,
		};
	}
}
