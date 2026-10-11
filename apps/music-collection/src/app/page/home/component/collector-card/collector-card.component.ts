import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { WallEntry } from '../../../collectors/collectors.model';
import { HOME_COLLECTOR_PINS } from '../../home.model';

/**
 * One collector, as the home page introduces them: the face, where they are
 * and how big the shelf is, the pins they have earned, and what they are
 * after right now.
 *
 * What they are after is the point of the card. A row of badges says what is
 * already done; the hunts say what could be shared tomorrow, and that is the
 * sentence a visitor can answer with a shelf of their own.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collector-card',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		@let who = collector();

		<a class="collector" [routerLink]="['/collector', who.uid]">
			<span class="who">
				@if (who.photoURL) {
					<img class="avatar" [src]="who.photoURL" alt="" />
				} @else {
					<span class="avatar initial" aria-hidden="true">{{
						who.initial
					}}</span>
				}

				<span class="name">
					<b>{{
						who.displayName ??
							('page.collector.aCollector' | transloco)
					}}</b>
					<span class="meta">
						@if (who.place) {
							{{ who.place }}
						}
						@if (who.copies) {
							<span class="copies">
								{{ who.copies | mcNumber }}
								{{ 'page.collector.records' | transloco }}
							</span>
						}
					</span>
				</span>
			</span>

			@if (who.badges.length) {
				<span class="pins">
					@for (badge of pins(); track badge.slug) {
						<span class="pin" [attr.title]="badge.name">
							@if (badge.imageUrl) {
								<img
									[src]="badge.imageUrl"
									alt=""
									loading="lazy"
								/>
							} @else {
								<i class="pi pi-shield" aria-hidden="true"></i>
							}
						</span>
					}
					@if (morePins() > 0) {
						<span class="more">+{{ morePins() }}</span>
					}
				</span>
			}

			@if (who.collecting.length) {
				<span class="chasing">{{
					'page.collectors.chasing' | transloco
				}}</span>
				<span class="hunts">
					@for (hunt of hunts(); track hunt.slug) {
						<span class="hunt">{{ hunt.name }}</span>
					}
					@if (moreHunts() > 0) {
						<span class="hunt more">+{{ moreHunts() }}</span>
					}
				</span>
			}
		</a>
	`,
	styles: `
		:host {
			display: block;
			height: 100%;
		}

		.collector {
			display: flex;
			flex-direction: column;
			gap: 0.55rem;
			height: 100%;
			padding: 1rem;
			color: inherit;
			text-decoration: none;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);

			&:hover {
				border-color: var(--mc-border-strong);
			}

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 2px;
			}
		}

		.who {
			display: flex;
			align-items: center;
			gap: 0.65rem;
		}

		.avatar {
			display: grid;
			place-items: center;
			width: 2.6rem;
			height: 2.6rem;
			overflow: hidden;
			object-fit: cover;
			background: var(--mc-bg-muted);
			border-radius: 50%;

			&.initial {
				font-family: var(--mc-font-display);
				font-size: 1.1rem;
				color: var(--mc-primary);
			}
		}

		.name {
			display: flex;
			min-width: 0;
			flex-direction: column;

			b {
				overflow: hidden;
				font-size: 0.95rem;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}

		.meta {
			display: flex;
			flex-wrap: wrap;
			gap: 0.3rem;
			font-size: 0.75rem;
			color: var(--mc-text-subtle);

			.copies::before {
				margin-right: 0.3rem;
				content: '·';
			}
		}

		.pins {
			display: flex;
			align-items: center;
			gap: 0.3rem;
		}

		.pin {
			display: grid;
			place-items: center;
			width: 1.6rem;
			height: 1.6rem;
			overflow: hidden;
			font-size: 0.8rem;
			color: var(--mc-accent);

			img {
				width: 100%;
				height: 100%;
				object-fit: contain;
			}
		}

		.pins .more {
			font-size: 0.72rem;
			color: var(--mc-text-subtle);
		}

		.chasing {
			margin-top: auto;
			font-size: 0.65rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.hunts {
			display: flex;
			flex-wrap: wrap;
			gap: 0.3rem;
		}

		.hunt {
			max-width: 100%;
			overflow: hidden;
			padding: 0.15rem 0.5rem;
			font-size: 0.72rem;
			text-overflow: ellipsis;
			white-space: nowrap;
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border);
			border-radius: 999px;
		}
	`,
})
export class CollectorCardComponent {
	public readonly collector = input.required<WallEntry>();

	protected readonly pins = computed(() =>
		this.collector().badges.slice(0, HOME_COLLECTOR_PINS)
	);

	protected readonly morePins = computed(
		() => this.collector().badges.length - HOME_COLLECTOR_PINS
	);

	protected readonly hunts = computed(() =>
		this.collector().collecting.slice(0, HOME_COLLECTOR_PINS)
	);

	protected readonly moreHunts = computed(
		() => this.collector().collecting.length - HOME_COLLECTOR_PINS
	);
}
