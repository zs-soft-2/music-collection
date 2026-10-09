import { TranslocoDirective } from '@jsverse/transloco';
import { NgxPermissionsModule } from 'ngx-permissions';

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RoleNames } from '@music-collection/api';

import { MenuGroup, MenuItem, MenuSection } from '../top-bar/api';
import { TopBarService } from '../top-bar/component/top-bar/top-bar.service';

/** The order the groups stand in on the rail; `general` carries no heading. */
const GROUP_ORDER: MenuGroup[] = [
	'general',
	'collection',
	'explore',
	'contribute',
];

/**
 * The standing navigation on a wide screen: every page the collector can
 * open, down the left-hand side, under the heading that says why it is
 * there.
 *
 * It exists because the bar across the top had run out of room — it could
 * only ever carry the pages a guest may see, and everything of the
 * collector's own had to hide under their avatar. A column has room for all
 * of it at once, which is the whole point: the shelf, the hunt and the
 * catalog are one tap apart rather than one tap plus a menu.
 *
 * Below the rail's breakpoint it draws nothing at all. The phone keeps the
 * bar and its sheet, which is a better shape for a thumb than a column is.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [TopBarService],
	selector: 'mc-side-rail',
	imports: [
		RouterLink,
		RouterLinkActive,
		NgxPermissionsModule,
		TranslocoDirective,
	],
	template: `
		<nav class="rail" *transloco="let t" [attr.aria-label]="t('nav.main')">
			@for (section of sections(); track section.group) {
				<div
					class="group"
					role="group"
					[attr.aria-label]="
						section.titleKey ? t(section.titleKey) : null
					"
				>
					@if (section.titleKey; as titleKey) {
						<p class="heading" aria-hidden="true">
							{{ t(titleKey) }}
						</p>
					}

					@for (item of section.items; track item.labelKey) {
						<a
							class="link"
							[routerLink]="item.routerLink"
							routerLinkActive="is-active"
							ariaCurrentWhenActive="page"
						>
							<i class="pi {{ item.icon }}" aria-hidden="true"></i>
							<span>{{ t(item.labelKey) }}</span>
						</a>
					}
				</div>
			}

			<div class="group" role="group">
				<a
					*ngxPermissionsOnly="adminRoles"
					class="link"
					routerLink="/admin"
					routerLinkActive="is-active"
					ariaCurrentWhenActive="page"
				>
					<i class="pi pi-cog" aria-hidden="true"></i>
					<span>{{ t('nav.admin') }}</span>
				</a>
			</div>
		</nav>
	`,
	styles: `
		:host {
			display: none;
		}

		/*
		 * The rail only appears where there is room for it beside the page
		 * rather than on top of it. Below this width the top bar's own menu
		 * is what navigates, and the rail is not rendered at all.
		 */
		@media (min-width: 1100px) {
			:host {
				position: fixed;
				top: var(--mc-app-bar-height);
				bottom: 0;
				left: 0;
				z-index: 2;
				display: block;
				width: var(--mc-rail-width);
				overflow-y: auto;
				background: color-mix(
					in srgb,
					var(--mc-bg-muted) 72%,
					transparent
				);
				backdrop-filter: blur(14px);
				border-right: 1px solid var(--mc-border);
			}
		}

		.rail {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
			padding: 1.25rem 0.75rem 2rem;
		}

		.group {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;
		}

		.heading {
			margin: 0 0 0.35rem 0.75rem;
			font-size: 0.65rem;
			font-weight: 700;
			letter-spacing: 0.16em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.link {
			position: relative;
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.55rem 0.75rem;
			border-radius: var(--mc-radius-md);
			color: var(--mc-text-muted);
			font-size: 0.9rem;
			text-decoration: none;
			transition:
				background var(--mc-duration-fast) ease,
				color var(--mc-duration-fast) ease;

			.pi {
				width: 1.1rem;
				font-size: 1rem;
				text-align: center;
			}

			span {
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}

		.link:hover,
		.link:focus-visible {
			background: var(--mc-card-bg-hover);
			color: var(--mc-text);
		}

		/*
		 * The page being read is marked twice — a filled row and a bar down
		 * its left edge — because the fill alone is a colour difference, and
		 * "which page am I on" should not be a colour question.
		 */
		.link.is-active {
			background: color-mix(in srgb, var(--mc-primary) 16%, transparent);
			color: var(--mc-text);
			font-weight: 600;
		}

		.link.is-active::before {
			content: '';
			position: absolute;
			top: 0.4rem;
			bottom: 0.4rem;
			left: 0;
			width: 3px;
			border-radius: 0 2px 2px 0;
			background: var(--mc-primary);
		}

		.link.is-active .pi {
			color: var(--mc-primary);
		}
	`,
})
export class SideRailComponent {
	private readonly componentService = inject(TopBarService);

	protected readonly adminRoles = [RoleNames.ADMIN];

	private readonly menuItems = this.componentService.createMenuItems();

	private readonly isAuthenticated = toSignal(
		this.componentService.selectIsAuthenticated$(),
		{ initialValue: false }
	);

	/**
	 * Every page the reader may actually open: a guest is shown the catalog
	 * and nothing of anybody's own, so the groups that would be entirely
	 * theirs disappear with them rather than standing there greyed out.
	 */
	protected readonly sections = computed<MenuSection[]>(() => {
		const authenticated = this.isAuthenticated();
		const items = this.menuItems.filter(
			(item) => authenticated || !item.requiresAuth
		);

		return GROUP_ORDER.map((group) => ({
			group,
			titleKey: group === 'general' ? null : `nav.group.${group}`,
			items: items.filter((item: MenuItem) => item.group === group),
		})).filter((section) => section.items.length > 0);
	});
}
