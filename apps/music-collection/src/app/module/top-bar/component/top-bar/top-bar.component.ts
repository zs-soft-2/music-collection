import { NgxPermissionsModule } from 'ngx-permissions';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BaseComponent, RoleNames } from '@music-collection/api';

import { PlayerMiniComponent } from '../../../../shared/player';
import { ExternalPlayerConsentService } from '../../../../data/external-player';
import { LayoutWidthService, ThemeService } from '../../../../theme';
import { TopBarService } from './top-bar.service';

const NAV_ICONS: Record<string, string> = {
	Home: 'pi-home',
	Collection: 'pi-th-large',
	Wishlist: 'pi-heart',
	Network: 'pi-sitemap',
	Map: 'pi-map-marker',
};

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [TopBarService],
	selector: 'mc-top-bar',
	styleUrls: ['./top-bar.component.scss'],
	templateUrl: './top-bar.component.html',
	imports: [
		RouterLink,
		RouterLinkActive,
		NgxPermissionsModule,
		PlayerMiniComponent,
	],
	host: {
		'(document:keydown.escape)': 'closeMenus()',
	},
})
export class TopBarComponent extends BaseComponent {
	private readonly componentService = inject(TopBarService);
	protected readonly theme = inject(ThemeService);
	protected readonly layoutWidth = inject(LayoutWidthService);
	/** Whether the outside players may be on the page at all. */
	protected readonly players = inject(ExternalPlayerConsentService);

	protected readonly adminRoles = [RoleNames.ADMIN];

	private readonly menuItems = this.componentService
		.createMenuItems()
		.map((item) => ({
			...item,
			icon: NAV_ICONS[item.label] ?? 'pi-circle',
		}));

	protected readonly params = toSignal(this.componentService.init$());
	protected readonly isAuthenticated = toSignal(
		this.componentService.selectIsAuthenticated$(),
		{ initialValue: false }
	);

	/**
	 * A guest is offered what there is to browse, and nothing that would only
	 * ever be empty for them. The personal links appear as the session is
	 * restored, the same moment the avatar takes the place of the Log in
	 * button.
	 */
	protected readonly navItems = computed(() =>
		this.menuItems.filter(
			(item) => !item.requiresAuth || this.isAuthenticated()
		)
	);

	protected readonly accountOpen = signal(false);
	protected readonly menuOpen = signal(false);

	protected readonly user = computed(() => this.params()?.user);
	/**
	 * Google's photo server sometimes refuses the image (429); the initials
	 * stand in for a photo that failed to load, until the URL changes.
	 */
	protected readonly failedAvatarUrl = signal<string | null>(null);
	protected readonly avatarUrl = computed(() => {
		const photo = this.user()?.photoURL;

		return photo && photo !== this.failedAvatarUrl() ? photo : null;
	});
	protected readonly initials = computed(() => {
		const name = this.user()?.displayName || this.user()?.email || '?';

		return name
			.split(/[\s@.]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0])
			.join('')
			.toUpperCase();
	});

	protected closeMenus(): void {
		this.accountOpen.set(false);
		this.menuOpen.set(false);
	}

	protected toggleAccount(): void {
		this.menuOpen.set(false);
		this.accountOpen.update((open) => !open);
	}

	protected toggleMenu(): void {
		this.accountOpen.set(false);
		this.menuOpen.update((open) => !open);
	}

	protected login(): void {
		this.closeMenus();
		this.componentService.login();
	}

	protected logout(): void {
		this.closeMenus();
		this.componentService.logout();
	}

	protected goHome(): void {
		this.closeMenus();
		this.componentService.imgClickHandler();
	}
}
