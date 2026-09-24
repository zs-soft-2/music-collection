import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/**
 * The eye on a collection row and card: it opens the entity's own page —
 * what the record looks like once it is read rather than listed.
 *
 * The page hands it the route (`link`), because only the collection knows
 * where its entity is shown; an entity with no page of its own simply has
 * no link, and then the button is not there at all.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-view-action',
	imports: [...I18N_IMPORTS, RouterLink],
	host: { '[hidden]': '!link()?.length' },
	template: `
		@if (link(); as route) {
			<a
				class="view"
				[routerLink]="route"
				[attr.aria-label]="ariaLabel()"
				[attr.title]="ariaLabel()"
			>
				<i class="pi pi-eye" aria-hidden="true"></i>
			</a>
		}
	`,
	styles: `
		:host {
			display: inline-flex;
		}

		.view {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 2rem;
			height: 2rem;
			color: var(--mc-text-muted);
			text-decoration: none;
			background: transparent;
			border-radius: 50%;
			transition:
				color 0.15s,
				background-color 0.15s;

			&:hover,
			&:focus-visible {
				color: var(--mc-text);
				background: var(--mc-border-strong);
			}

			i {
				font-size: 0.875rem;
			}
		}
	`,
})
export class ViewActionComponent {
	/** Where the entity is shown; nothing when it has no page. */
	public readonly link = input<unknown[] | null>(null);

	/** What kind of record this is, for the screen reader: "View album …". */
	public readonly entity = input<string>('');

	/** Which one it is — the name the row shows. */
	public readonly name = input<string>('');

	protected readonly ariaLabel = computed(() =>
		['View', this.entity(), this.name()].filter(Boolean).join(' ')
	);
}
