import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { filter, map } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { RETURN_URL_PARAM } from '@music-collection/api';

import { AdminAccessService } from './admin-access.service';

/** Az admin felület entitás-útvonalai (/admin/<entitás>/edit/:id). */
export type AdminEditEntity =
	| 'artist'
	| 'album'
	| 'release'
	| 'label'
	| 'musician'
	| 'collection-item'
	| 'wishlist-item'
	| 'document';

const ENTITY_NAMES: Record<AdminEditEntity, string> = {
	artist: 'artist',
	album: 'album',
	release: 'release',
	label: 'label',
	musician: 'musician',
	'collection-item': 'collection item',
	'wishlist-item': 'wishlist item',
	document: 'document',
};

/**
 * „Edit in admin” link a nézeti oldalakról közvetlenül az entitás admin
 * szerkesztőjére — csak adminnak jelenik meg. Magával viszi az oldal címét,
 * a szerkesztő bezárásakor ide tér vissza. A `button` változat a
 * fejlécekbe, az `icon` a kártyákra és sorokra való.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-admin-edit-link',
	imports: [...I18N_IMPORTS, RouterLink],
	host: {
		'[class.is-icon]': "variant() === 'icon'",
		'[hidden]': '!visible()',
	},
	template: `
		@if (visible()) {
			<a
				class="edit"
				[routerLink]="['/admin', entity(), 'edit', id()]"
				[queryParams]="queryParams()"
				[attr.aria-label]="ariaLabel()"
				[attr.title]="variant() === 'icon' ? ariaLabel() : null"
			>
				<i class="pi pi-pencil" aria-hidden="true"></i>
				@if (variant() === 'button') {
					<span>{{
						'ui.adminEditLink.edit-in-admin' | transloco
					}}</span>
				}
			</a>
		}
	`,
	styles: `
		:host {
			display: inline-flex;
		}

		.edit {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			height: 36px;
			box-sizing: border-box;
			padding: 0 0.875rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			background: color-mix(in srgb, var(--mc-bg) 60%, transparent);
			color: var(--mc-text);
			font-size: 0.8125rem;
			font-weight: 600;
			text-decoration: none;
			white-space: nowrap;
			backdrop-filter: blur(6px);

			&:hover {
				background: var(--mc-surface-2);
			}

			i {
				font-size: 0.8125rem;
			}
		}

		:host(.is-icon) .edit {
			width: 32px;
			height: 32px;
			justify-content: center;
			padding: 0;
			border-radius: 9999px;
		}
	`,
})
export class AdminEditLinkComponent {
	private readonly adminAccess = inject(AdminAccessService);
	private readonly router = inject(Router);

	private readonly currentUrl = toSignal(
		this.router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map(() => this.router.url)
		),
		{ initialValue: this.router.url }
	);

	public readonly entity = input.required<AdminEditEntity>();
	public readonly id = input.required<string | null | undefined>();
	/** Mit szerkesztünk — a képernyőolvasó és a tooltip szövegéhez. */
	public readonly name = input<string>('');
	public readonly variant = input<'button' | 'icon'>('button');

	protected readonly visible = computed(
		() => this.adminAccess.isAdmin() && !!this.id()
	);

	protected readonly queryParams = computed(() => ({
		[RETURN_URL_PARAM]: this.currentUrl(),
	}));

	protected readonly ariaLabel = computed(() => {
		const name = this.name();
		const entity = ENTITY_NAMES[this.entity()];

		return name
			? `Edit ${entity} ${name} in admin`
			: `Edit ${entity} in admin`;
	});
}
