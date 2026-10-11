import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { AiMarkComponent } from '../../../../shared/music-ui';
import { CollectionBadgeView } from '../../collections.model';

/**
 * The pin the collection pays, large enough to be looked at.
 *
 * It is what a collector is playing for, so it stands whole rather than as
 * an icon beside a line of text. Until it is won it is shown faded, the way
 * a record still to find is, with how many records stand between the shelf
 * and it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-badge',
	imports: [...I18N_IMPORTS, AiMarkComponent],
	template: `
		@let pin = badge();

		@if (pin.artworkUrl) {
			<img class="art" [src]="pin.artworkUrl" alt="" />
		} @else {
			<i
				class="icon"
				[class]="pin.icon || 'pi pi-star'"
				aria-hidden="true"
			></i>
		}

		<p class="name">
			{{ pin.name }}
			<!-- A pin képét képmodell rajzolta; ahol látszik, ott ezt ki is
			     mondjuk. -->
			@if (pin.artworkUrl) {
				<mc-ai-mark
					[compact]="true"
					[hint]="'ui.aiMark.hint.image' | transloco"
				></mc-ai-mark>
			}
		</p>

		@if (pin.description) {
			<p class="description">{{ pin.description }}</p>
		}

		<p class="state">
			@if (pin.earned) {
				{{ 'ui.collectionDetailPage.badge.earned' | transloco }}
			} @else {
				{{ missing() | mcPlural: 'ui.collectionDetailPage.badge.toGo' }}
			}
		</p>
	`,
	styles: `
		:host {
			display: block;
			text-align: center;
		}

		.art {
			width: 7rem;
			height: 7rem;
			object-fit: contain;

			/* A még meg nem szerzett pin fakó, ahogy a hiányzó lemez is. */
			:host(:not(.is-earned)) & {
				filter: grayscale(1);
				opacity: 0.55;
			}
		}

		.icon {
			font-size: 3rem;
			color: var(--mc-text-subtle);

			:host(.is-earned) & {
				color: var(--mc-accent);
			}
		}

		.name {
			margin: 0.5rem 0 0;
			font-family: var(--mc-font-display);
			font-size: 1.15rem;
			letter-spacing: 0.02em;
			text-transform: uppercase;
		}

		.description {
			margin: 0.3rem 0 0;
			font-size: 0.82rem;
			line-height: 1.4;
			color: var(--mc-text-muted);
		}

		.state {
			margin: 0.6rem 0 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);

			:host(.is-earned) & {
				color: var(--mc-accent);
			}
		}
	`,
	host: { '[class.is-earned]': 'badge().earned' },
})
export class CollectionBadgeComponent {
	public readonly badge = input.required<CollectionBadgeView>();
	/** How many records are still between the shelf and the pin. */
	public readonly missing = input(0);
}
