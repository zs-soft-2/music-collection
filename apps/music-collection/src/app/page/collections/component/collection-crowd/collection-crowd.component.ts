import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionCrowd } from '../../../collectors/collectors.model';

/**
 * Who is on this collection: whoever finished it, then whoever says they
 * are after it.
 *
 * A rule is an abstraction until somebody is standing on it. The finishers
 * come first and are marked as such — they are the proof that the set can
 * be closed, and the reason the pin is worth having.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-crowd',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		<h2 class="panel-title">
			{{ 'ui.collectionDetailPage.crowd.title' | transloco }}
		</h2>

		<ul class="collectors">
			@for (face of crowd().finishers; track face.uid) {
				<li>
					<a
						class="collector is-finisher"
						[routerLink]="['/collector', face.uid]"
					>
						@if (face.photoURL) {
							<img [src]="face.photoURL" alt="" loading="lazy" />
						} @else {
							<span class="initial">{{ face.initial }}</span>
						}
						<span class="who">
							<b>{{
								face.displayName ??
									('page.collector.aCollector' | transloco)
							}}</b>
							<span class="state">{{
								'ui.collectionDetailPage.crowd.finished'
									| transloco
							}}</span>
						</span>
					</a>
				</li>
			}

			@for (face of crowd().hunters; track face.uid) {
				<li>
					<a
						class="collector"
						[routerLink]="['/collector', face.uid]"
					>
						@if (face.photoURL) {
							<img [src]="face.photoURL" alt="" loading="lazy" />
						} @else {
							<span class="initial">{{ face.initial }}</span>
						}
						<span class="who">
							<b>{{
								face.displayName ??
									('page.collector.aCollector' | transloco)
							}}</b>
							<span class="state">{{
								'ui.collectionDetailPage.crowd.hunting'
									| transloco
							}}</span>
						</span>
					</a>
				</li>
			}
		</ul>
	`,
	styles: `
		:host {
			display: block;
		}

		.panel-title {
			margin: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.panel-lead {
			margin: 0.45rem 0 0;
			font-size: 0.8rem;
			line-height: 1.4;
			color: var(--mc-text-muted);
		}

		.collectors {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
			margin: 0.9rem 0 0;
			padding: 0;
			list-style: none;
		}

		.collector {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.35rem;
			color: inherit;
			text-decoration: none;
			border-radius: 999px;

			&:hover {
				background: var(--mc-surface-2);
			}

			img,
			.initial {
				display: grid;
				place-items: center;
				width: 2rem;
				height: 2rem;
				flex: none;
				overflow: hidden;
				font-family: var(--mc-font-display);
				font-size: 0.85rem;
				color: var(--mc-primary);
				background: var(--mc-bg-muted);
				border-radius: 50%;
				object-fit: cover;
			}

			&.is-finisher img,
			&.is-finisher .initial {
				border: 1px solid var(--mc-accent);
			}
		}

		.who {
			display: flex;
			min-width: 0;
			flex-direction: column;

			b {
				overflow: hidden;
				font-size: 0.85rem;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}

		.state {
			font-size: 0.68rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);

			.is-finisher & {
				color: var(--mc-accent);
			}
		}
	`,
})
export class CollectionCrowdComponent {
	public readonly crowd = input.required<CollectionCrowd>();
}
