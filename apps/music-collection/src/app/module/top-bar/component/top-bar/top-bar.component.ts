import { TranslocoDirective } from '@jsverse/transloco';
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
import { LanguagePickerComponent } from '../../../../i18n';
import { SceneBackdropService } from '../../../../shared/backdrop';
import { LayoutWidthService, ThemeService } from '../../../../theme';
import { MenuGroup, MenuItem, MenuSection } from '../../api';
import { TopBarService } from './top-bar.service';

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
		LanguagePickerComponent,
		TranslocoDirective,
	],
	host: {
		'(document:keydown.escape)': 'closeMenus()',
	},
})
export class TopBarComponent extends BaseComponent {
	private readonly componentService = inject(TopBarService);
	protected readonly theme = inject(ThemeService);
	protected readonly layoutWidth = inject(LayoutWidthService);
	/** Milyen világ áll a lap mögött: nincs, álló vagy élő. */
	protected readonly backdrop = inject(SceneBackdropService);
	/** Whether the outside players may be on the page at all. */
	protected readonly players = inject(ExternalPlayerConsentService);

	protected readonly adminRoles = [RoleNames.ADMIN];

	private readonly menuItems = this.componentService.createMenuItems();

	protected readonly params = toSignal(this.componentService.init$());
	protected readonly isAuthenticated = toSignal(
		this.componentService.selectIsAuthenticated$(),
		{ initialValue: false }
	);

	/**
	 * The bar carries what anyone may browse, and only that. It used to grow
	 * by six links the moment a session was restored, which both crowded the
	 * row and moved every link that was already on it.
	 */
	protected readonly navItems = this.menuItems.filter(
		(item) => !item.requiresAuth
	);

	/**
	 * The collector's own pages sit under their avatar, where the rest of what
	 * is theirs already lives, laid out under the headings that say why each
	 * one is there. Nothing filters them: the menu itself only exists once
	 * there is somebody signed in to own them.
	 */
	protected readonly accountSections = this.toSections(
		this.menuItems.filter((item) => item.requiresAuth)
	);

	/**
	 * The sheet has a whole screen to fill and no avatar to hide anything
	 * behind, so on a phone every page stays one list and one tap deep — the
	 * same headings, with the home link above them all.
	 */
	protected readonly sheetSections = computed(() =>
		this.toSections(
			this.menuItems.filter(
				(item) => !item.requiresAuth || this.isAuthenticated()
			)
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

	/**
	 * Keeps the groups in the order they were declared in, and drops the ones
	 * nothing fell into — a guest's sheet has no `contribute` links at all.
	 */
	private toSections(items: MenuItem[]): MenuSection[] {
		const order: MenuGroup[] = [
			'general',
			'collection',
			'explore',
			'contribute',
		];

		return order
			.map((group) => ({
				group,
				titleKey: group === 'general' ? null : `nav.group.${group}`,
				items: items.filter((item) => item.group === group),
			}))
			.filter((section) => section.items.length > 0);
	}

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
