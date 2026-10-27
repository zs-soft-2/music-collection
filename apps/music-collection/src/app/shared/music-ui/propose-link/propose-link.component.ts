import { map, of, switchMap } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EntityRequest } from '@music-collection/api';
import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';
import { NgxPermissionsService } from 'ngx-permissions';

import {
	PendingProposalService,
	pendingFieldsFor,
	requestFieldLabelKey,
} from '../../../data/request';
import { AdminAccessService } from '../admin-edit-link/admin-access.service';

/** Az entitások, amikre a gyűjtő módosítást javasolhat. */
export type ProposeEntity =
	'artist' | 'album' | 'release' | 'label' | 'musician';

/**
 * „Javaslom a módosítást” link a katalógus oldaláról a javaslat-űrlapra.
 *
 * A gyűjtőnek szól, nem az adminnak: aki maga is írhatja a katalógust, annak
 * a kérés kerülőút — ő az `mc-admin-edit-link`-et látja ugyanitt. A jog, amit
 * néz, ugyanaz, ami a beküldést engedi (`createOwnedArtistEntity`): a
 * szabályok ebből döntenek, a felület pedig ne kínáljon olyat, ami a
 * beküldésnél derülne ki.
 *
 * Ha van még el nem bírált javaslat erre az entitásra, a link a helyén
 * állapotot mutat. A katalógus nem változik a döntésig — sem a beküldőnek,
 * sem másnak —, és ez így is helyes: két igazság közül az egyik mindig
 * elavul, és a beküldő az lenne, aki nem tudja, mit lát a többi gyűjtő. Amit
 * viszont tudnia kell, hogy a kérése megvan és vár valakire; enélkül a
 * beküldés után az oldal pontosan úgy néz ki, mint előtte.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-propose-link',
	imports: [...I18N_IMPORTS, RouterLink],
	host: { '[hidden]': '!visible()' },
	template: `
		@if (visible()) {
			@if (pendingLabel(); as label) {
				<a
					class="propose is-pending"
					routerLink="/my-requests"
					[attr.title]="'ui.proposeLink.pending-title' | transloco"
				>
					<i class="pi pi-clock" aria-hidden="true"></i>
					<span>{{ label }}</span>
				</a>
			} @else {
				<a
					class="propose"
					[routerLink]="['/propose', entity(), 'edit', id()]"
				>
					<i class="pi pi-pen-to-square" aria-hidden="true"></i>
					<span>{{
						'ui.proposeLink.suggest-a-change' | transloco
					}}</span>
				</a>
			}
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

		.propose.is-pending {
			border-color: color-mix(
				in srgb,
				var(--mc-status-warn) 60%,
				transparent
			);
			color: var(--mc-status-warn);
		}
	`,
})
export class ProposeLinkComponent {
	private readonly adminAccess = inject(AdminAccessService);
	private readonly pendingProposals = inject(PendingProposalService);
	private readonly permissionsService = inject(NgxPermissionsService);
	private readonly text = inject(TextService);

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

	/**
	 * A gyűjtő függő kérései — csak ott, ahol a gomb egyáltalán látszik. Egy
	 * admin és egy látogató nem javasol, és amit nem mutatunk meg nekik, azt
	 * ne is olvassuk ki a nevükben.
	 */
	private readonly myPending = toSignal(
		toObservable(this.visible).pipe(
			switchMap((visible) =>
				visible ? this.pendingProposals.mine$ : of<EntityRequest[]>([])
			)
		),
		{ initialValue: [] as EntityRequest[] }
	);

	/** Amire ezen az entitáson még nincs döntés. */
	private readonly pendingFields = computed(() =>
		pendingFieldsFor(this.myPending(), this.entity(), this.id())
	);

	/**
	 * Egy mezőt néven nevezünk — az mondja meg a gyűjtőnek, hogy épp arról
	 * van szó, amit lát —, többet megszámolunk: öt mezőnév egy gomb feliratán
	 * már nem felirat.
	 */
	protected readonly pendingLabel = computed<string | null>(() => {
		const fields = this.pendingFields();
		const translate = this.text.translator();

		if (!fields.length) {
			return null;
		}

		return fields.length === 1
			? translate('ui.proposeLink.pending-one', {
					field: translate(requestFieldLabelKey(fields[0])),
				})
			: translate('ui.proposeLink.pending-many', {
					count: fields.length,
				});
	});
}
