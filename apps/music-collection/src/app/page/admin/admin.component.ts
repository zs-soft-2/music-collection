import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	NavigationEnd,
	Router,
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
} from '@angular/router';
import { BreadcrumbModule } from '@music-collection/ui';
import { filter } from 'rxjs';

import { ADMIN_NAV } from './admin-nav';

/**
 * Az admin felület héja: csoportosított oldalsáv (tableten és mobilon
 * ikonsáv, a menügombbal kinyitható), morzsamenü és a tartalom.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-admin',
	templateUrl: './admin.component.html',
	styleUrls: ['./admin.component.scss'],
	imports: [BreadcrumbModule, RouterLink, RouterLinkActive, RouterOutlet],
	host: {
		'(document:keydown.escape)': 'expanded.set(false)',
	},
})
export class AdminComponent {
	private readonly router = inject(Router);

	protected readonly groups = ADMIN_NAV;
	protected readonly expanded = signal(false);

	public constructor() {
		// Oldalváltáskor a kinyitott (overlay) oldalsáv bezárul.
		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed()
			)
			.subscribe(() => this.expanded.set(false));
	}

	protected toggle(): void {
		this.expanded.update((open) => !open);
	}
}
