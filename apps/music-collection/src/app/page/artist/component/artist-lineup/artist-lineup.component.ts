import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { LineupMember, LineupView } from '../../artist.mapper';

/**
 * A band's line-up: members with their instruments and years, each with a
 * time bar across the band's years on record (a current member whose start
 * year is unknown gets a dot at the present end), and the guest musicians.
 * Former members and guests are collapsed and only rendered once opened.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-lineup',
	imports: [NgTemplateOutlet, RouterLink],
	template: `
		@let view = lineup();

		@if (currentMembers().length) {
			<ul class="members">
				@for (member of currentMembers(); track member.musicianUid) {
					<ng-container
						*ngTemplateOutlet="
							memberRow;
							context: { $implicit: member }
						"
					/>
				}
			</ul>
			<ng-container *ngTemplateOutlet="axis" />
		}

		@if (formerMembers().length) {
			<div class="collapsible-head">
				<h3 class="subsection-title" id="former-members-title">
					Former members
					<span class="count">{{ formerMembers().length }}</span>
				</h3>
				<button
					type="button"
					class="text-button"
					aria-controls="former-members"
					[attr.aria-expanded]="showFormer()"
					(click)="showFormer.set(!showFormer())"
				>
					{{
						showFormer()
							? 'Hide former members'
							: 'Show former members'
					}}
				</button>
			</div>

			<!-- Rendered only on request; stays rendered once opened. -->
			@defer (when showFormer()) {
				<div
					id="former-members"
					class="collapsible"
					[hidden]="!showFormer()"
					aria-labelledby="former-members-title"
				>
					<ul class="members">
						@for (
							member of formerMembers();
							track member.musicianUid
						) {
							<ng-container
								*ngTemplateOutlet="
									memberRow;
									context: { $implicit: member }
								"
							/>
						}
					</ul>
					<ng-container *ngTemplateOutlet="axis" />
				</div>
			}
		}

		<ng-template #memberRow let-member>
			<li class="member" [class.active]="member.active">
				<div class="who">
					<a
						class="name"
						[routerLink]="['/musician', member.musicianUid]"
						>{{ member.name }}</a
					>
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
							{{ member.albumCount === 1 ? 'album' : 'albums' }}
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
				} @else if (member.active) {
					<!-- Start year unknown: only "now" is certain. -->
					<div class="track" aria-hidden="true">
						<span class="dot"></span>
					</div>
				}
			</li>
		</ng-template>

		<ng-template #axis>
			@if (view.span) {
				<div class="axis" aria-hidden="true">
					<span>{{ view.span.from }}</span>
					<span>{{ view.span.to }}</span>
				</div>
			}
		</ng-template>

		@if (view.guests.length) {
			<div class="collapsible-head">
				<h3 class="subsection-title" id="guest-musicians-title">
					Guest musicians
					<span class="count">{{ view.guests.length }}</span>
				</h3>
				<button
					type="button"
					class="text-button"
					aria-controls="guest-musicians"
					[attr.aria-expanded]="showGuests()"
					(click)="showGuests.set(!showGuests())"
				>
					{{
						showGuests()
							? 'Hide guest musicians'
							: 'Show guest musicians'
					}}
				</button>
			</div>

			<!-- Rendered only on request; stays rendered once opened. -->
			@defer (when showGuests()) {
				<ul
					id="guest-musicians"
					class="guests collapsible"
					[hidden]="!showGuests()"
					aria-labelledby="guest-musicians-title"
				>
					@for (guest of view.guests; track guest.musicianUid) {
						<li class="guest">
							<a
								class="name"
								[routerLink]="['/musician', guest.musicianUid]"
								>{{ guest.name }}</a
							>
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
			color: var(--mc-text);
			text-decoration: none;
		}

		.name:hover {
			text-decoration: underline;
		}

		.name:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 2px;
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

		/* A current member without a known start year: a dot at "now". */
		.dot {
			position: absolute;
			top: 0;
			right: 0;
			width: 10px;
			height: 10px;
			background: var(--mc-chart);
			border-radius: 50%;
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

		.collapsible-head {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 1.25rem;
			align-items: baseline;
			margin-top: 1.75rem;
		}

		.collapsible-head .subsection-title {
			margin: 0;
		}

		.collapsible-head .text-button {
			margin-top: 0;
		}

		.count {
			margin-left: 0.35rem;
			color: var(--mc-text-subtle);
		}

		.collapsible[hidden] {
			display: none;
		}

		.collapsible {
			margin-top: 0.4rem;
		}

		.subsection-title {
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

	protected readonly showGuests = signal(false);
	protected readonly showFormer = signal(false);

	protected readonly currentMembers = computed(() =>
		this.lineup().members.filter((member) => member.active)
	);

	protected readonly formerMembers = computed(() =>
		this.lineup().members.filter((member) => !member.active)
	);

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
