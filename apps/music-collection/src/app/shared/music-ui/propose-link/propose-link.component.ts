import { map } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { NgxPermissionsService } from 'ngx-permissions';

import { AdminAccessService } from '../admin-edit-link/admin-access.service';

/** Az entitások, amikre a gyűjtő módosítást javasolhat. */
export type ProposeEntity =
	| 'artist'
	| 'album'
	| 'release'
	| 'label'
	| 'musician';

/**
 * „Javaslom a módosítást” link a katalógus oldaláról a javaslat-űrlapra.
 *
 * A gyűjtőnek szól, nem az adminnak: aki maga is írhatja a katalógust, annak
 * a kérés kerülőút — ő az `mc-admin-edit-link`-et látja ugyanitt. A jog, amit
 * néz, ugyanaz, ami a beküldést engedi (`createOwnedArtistEntity`): a
 * szabályok ebből döntenek, a felület pedig ne kínáljon olyat, ami a
 * beküldésnél derülne ki.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-propose-link',
	imports: [...I18N_IMPORTS, RouterLink],
	host: { '[hidden]': '!visible()' },
	template: `
		@if (visible()) {
			<a
				class="propose"
				[routerLink]="['/propose', entity(), 'edit', id()]"
			>
				<i class="pi pi-pen-to-square" aria-hidden="true"></i>
				<span>{{ 'ui.proposeLink.suggest-a-change' | transloco }}</span>
			</a>
		}
	`,
	styles: `
		:host {
			display: inline-flex;
		}

		.propose {
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
	`,
})
export class ProposeLinkComponent {
	private readonly adminAccess = inject(AdminAccessService);
	private readonly permissionsService = inject(NgxPermissionsService);

	public readonly entity = input.required<ProposeEntity>();
	public readonly id = input.required<string | null | undefined>();

	/** A saját entitás felvételének joga; ez engedi a beküldést is. */
	private readonly canPropose = toSignal(
		this.permissionsService.permissions$.pipe(
			map((permissions) => 'createOwnedArtistEntity' in permissions)
		),
		{ initialValue: false }
	);

	protected readonly visible = computed(
		() => this.canPropose() && !this.adminAccess.isAdmin() && !!this.id()
	);
}
