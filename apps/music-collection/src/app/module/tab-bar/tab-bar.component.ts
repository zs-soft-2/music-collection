import { TranslocoDirective } from '@jsverse/transloco';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthenticationStateService } from '@music-collection/api';

/** One tab: where it goes, what it is called, and what it looks like. */
interface Tab {
	labelKey: string;
	icon: string;
	routerLink: string[];
	/**
	 * The one tab drawn as a filled circle above the row. Reserved for
	 * adding a record: it is the only thing on this bar that makes the
	 * collection bigger, and the only one worth a thumb's first guess.
	 */
	accent?: boolean;
}

/**
 * The thumb's menu: five places on a phone, across the bottom of the screen.
 *
 * It is not a smaller version of the rail. The rail lists everything; this
 * lists the five a collector actually goes to, and the hamburger still holds
 * the rest — so nothing is lost by keeping this short, and a lot is lost by
 * making it long.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-tab-bar',
	imports: [RouterLink, RouterLinkActive, TranslocoDirective],
	template: `
		<nav class="tabs" *transloco="let t" [attr.aria-label]="t('nav.main')">
			@for (tab of tabs(); track tab.labelKey) {
				<a
					class="tab"
					[class.is-accent]="tab.accent"
					[routerLink]="tab.routerLink"
					routerLinkActive="is-active"
					ariaCurrentWhenActive="page"
				>
					<span class="glyph">
						<i class="pi {{ tab.icon }}" aria-hidden="true"></i>
					</span>
					<span class="label">{{ t(tab.labelKey) }}</span>
				</a>
			}
		</nav>
	`,
	styles: `
		:host {
			display: none;
		}

		/*
		 * Csak telefonon. Fölötte a bal oldali sáv, illetve a felső sáv
		 * menüje navigál, és ott egy alsó sáv csak elvenné a helyet.
		 */
		@media (max-width: 720px) {
			:host {
				position: fixed;
				right: 0;
				bottom: 0;
				left: 0;
				/* A lebegő lejátszó (1000) fölé nem megy, a tartalom fölé igen. */
				z-index: 900;
				display: block;
				padding-bottom: env(safe-area-inset-bottom, 0px);
				background: color-mix(
					in srgb,
					var(--mc-bg-muted) 88%,
					transparent
				);
				backdrop-filter: blur(16px);
				border-top: 1px solid var(--mc-border);
			}
		}

		.tabs {
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			align-items: end;
			height: var(--mc-tab-bar-height);
		}

		.tab {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 0.2rem;
			height: 100%;
			padding: 0 0.15rem;
			color: var(--mc-text-subtle);
			font-size: 0.65rem;
			text-decoration: none;
		}

		.glyph {
			display: grid;
			place-items: center;
			width: var(--mc-circle-sm);
			height: var(--mc-circle-sm);
			border-radius: 50%;
			font-size: 1.05rem;
		}

		.label {
			max-width: 100%;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		/*
		 * Az aktív lap nem csak színnel válik el: a korong is kigyúl
		 * mögötte, mert egy telefon képernyőjén a színkülönbség kevés.
		 */
		.tab.is-active {
			color: var(--mc-text);
			font-weight: 600;
		}

		.tab.is-active .glyph {
			background: color-mix(in srgb, var(--mc-primary) 18%, transparent);
			color: var(--mc-primary);
		}

		/* A hozzáadás: kiemelt korong, ami kilóg a sorból. */
		.tab.is-accent .glyph {
			width: var(--mc-circle-xl);
			height: var(--mc-circle-xl);
			margin-top: -1.1rem;
			background: var(--mc-primary);
			box-shadow: 0 6px 16px -6px var(--mc-primary);
			color: var(--mc-on-primary);
			font-size: 1.25rem;
		}

		.tab.is-accent.is-active .glyph {
			background: var(--mc-primary);
			color: var(--mc-on-primary);
		}
	`,
})
export class TabBarComponent {
	private readonly authentication = inject(AuthenticationStateService);

	private readonly isAuthenticated = toSignal(
		this.authentication.selectIsAuthenticated$(),
		{ initialValue: false }
	);

	/**
	 * Five either way, so the bar never changes height when a session is
	 * restored. A guest gets the five worth browsing; a collector gets their
	 * own shelf and the way onto it.
	 */
	protected readonly tabs = computed<Tab[]>(() =>
		this.isAuthenticated()
			? [
					{
						labelKey: 'nav.home',
						icon: 'pi-home',
						routerLink: ['/home'],
					},
					{
						labelKey: 'nav.collection',
						icon: 'pi-th-large',
						routerLink: ['/collection'],
					},
					{
						labelKey: 'nav.scan',
						icon: 'pi-plus',
						routerLink: ['/scan'],
						accent: true,
					},
					{
						labelKey: 'nav.wishlist',
						icon: 'pi-heart',
						routerLink: ['/wishlist'],
					},
					{
						labelKey: 'nav.overview',
						icon: 'pi-chart-pie',
						routerLink: ['/overview'],
					},
				]
			: [
					{
						labelKey: 'nav.home',
						icon: 'pi-home',
						routerLink: ['/home'],
					},
					{
						labelKey: 'nav.collections',
						icon: 'pi-bookmark',
						routerLink: ['/collections'],
					},
					{
						labelKey: 'nav.collectors',
						icon: 'pi-users',
						routerLink: ['/collectors'],
					},
					{
						labelKey: 'nav.concerts',
						icon: 'pi-ticket',
						routerLink: ['/concert'],
					},
					{
						labelKey: 'nav.upcoming',
						icon: 'pi-calendar',
						routerLink: ['/upcoming'],
					},
				]
	);
}
