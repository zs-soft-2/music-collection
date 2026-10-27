import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
	NavigationEnd,
	Router,
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
	UrlTree,
} from '@angular/router';
import { ReturnNavigationService } from '@music-collection/api';
import { BreadcrumbModule } from '@music-collection/ui';
import { filter, map } from 'rxjs';

import { ADMIN_NAV } from './admin-nav';
import { AdminStore } from './admin.store';

const HIDDEN_STORAGE_KEY = 'mc-admin-nav-hidden';
/** Ez alatt a menü fiók, fölötte oldalsáv (a stílus ugyanezt a határt húzza). */
const COMPACT_QUERY = '(max-width: 1024px)';

/**
 * Az admin felület héja: csoportosított menü, morzsamenü és a tartalom.
 * Asztalon oldalsáv, ami teljesen el is rejthető, hogy a tartalomé legyen a
 * szélesség (a választás ebben a böngészőben megmarad); tableten és
 * mobilon ugyanez a menü fiók, amit a tartalom tetején lévő gomb nyit. Ha egy nyilvános oldalról
 * érkeztünk (`returnUrl`), vissza link oda.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-admin',
	templateUrl: './admin.component.html',
	styleUrls: ['./admin.component.scss'],
	imports: [
		...I18N_IMPORTS,
		BreadcrumbModule,
		RouterLink,
		RouterLinkActive,
		RouterOutlet,
	],
	providers: [AdminStore],
	host: {
		'(document:keydown.escape)': 'expanded.set(false)',
	},
})
export class AdminComponent {
	private readonly router = inject(Router);
	private readonly returnNavigation = inject(ReturnNavigationService);

	protected readonly store = inject(AdminStore);
	protected readonly groups = ADMIN_NAV;
	/** The public page the editor was opened from, as a link target. */
	protected readonly returnLink = toSignal(
		this.router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map(() => this.createReturnLink())
		),
		{ initialValue: this.createReturnLink() }
	);
	protected readonly expanded = signal(false);
	/** Szűk képernyő: a menü fiók, az elrejtés itt nem számít. */
	protected readonly compact = signal(false);
	/** Teljesen elrejtett oldalsáv: a tartalom kapja a teljes szélességet. */
	protected readonly hidden = signal(readHidden());

	public constructor() {
		this.followCompact();

		// Oldalváltáskor a kinyitott (overlay) oldalsáv bezárul.
		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed()
			)
			.subscribe(() => this.expanded.set(false));
	}

	private followCompact(): void {
		if (typeof matchMedia !== 'function') {
			return;
		}

		const query = matchMedia(COMPACT_QUERY);
		const update = () => {
			this.compact.set(query.matches);

			if (!query.matches) {
				this.expanded.set(false);
			}
		};

		update();
		query.addEventListener('change', update);
		inject(DestroyRef).onDestroy(() =>
			query.removeEventListener('change', update)
		);
	}

	private createReturnLink(): UrlTree | null {
		const returnUrl = this.returnNavigation.returnUrl();

		return returnUrl ? this.router.parseUrl(returnUrl) : null;
	}

	protected toggle(): void {
		this.expanded.update((open) => !open);
	}

	protected hide(): void {
		this.expanded.set(false);
		this.setHidden(true);
	}

	protected show(): void {
		this.setHidden(false);
	}

	private setHidden(hidden: boolean): void {
		this.hidden.set(hidden);

		try {
			localStorage.setItem(HIDDEN_STORAGE_KEY, String(hidden));
		} catch {
			// A tárolás nem elérhető (pl. privát ablak): a munkamenetig él.
		}
	}
}

function readHidden(): boolean {
	try {
		return localStorage.getItem(HIDDEN_STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}
