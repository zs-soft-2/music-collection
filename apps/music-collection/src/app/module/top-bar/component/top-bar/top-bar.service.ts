import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
	AuthenticationStateService,
	AuthorizationService,
	User,
} from '@music-collection/api';

import { MenuItem, TopBarParams } from '../../api';

@Injectable()
export class TopBarService {
	private authenticationStateService = inject(AuthenticationStateService);
	private authorizationService = inject(AuthorizationService);
	private router = inject(Router);

	/**
	 * Ordered by what the collector came to do, not by what the route needs.
	 * The groups are what the account menu and the phone sheet lay out under
	 * their headings, so the order here is the order on screen.
	 */
	public createMenuItems(): MenuItem[] {
		return [
			{
				labelKey: 'nav.home',
				icon: 'pi-home',
				routerLink: ['/home'],
				group: 'general',
			},

			// A polc és ami rajta van: megnézni, gyarapítani, kívánni.
			{
				labelKey: 'nav.collection',
				icon: 'pi-th-large',
				routerLink: ['/collection'],
				group: 'collection',
				requiresAuth: true,
			},
			{
				labelKey: 'nav.scan',
				icon: 'pi-camera',
				routerLink: ['/scan'],
				group: 'collection',
				requiresAuth: true,
			},
			{
				labelKey: 'nav.shelf-scan',
				icon: 'pi-images',
				routerLink: ['/shelf-scan'],
				group: 'collection',
				requiresAuth: true,
			},
			{
				labelKey: 'nav.wishlist',
				icon: 'pi-heart',
				routerLink: ['/wishlist'],
				group: 'collection',
				requiresAuth: true,
			},

			// Amiért érdemes körülnézni: a katalógus, a játék, a többiek.
			{
				labelKey: 'nav.collections',
				icon: 'pi-bookmark',
				routerLink: ['/collections'],
				group: 'explore',
			},
			{
				labelKey: 'nav.radio',
				icon: 'pi-play-circle',
				routerLink: ['/radio'],
				group: 'explore',
				requiresAuth: true,
			},
			{
				labelKey: 'nav.daily-question',
				icon: 'pi-question-circle',
				routerLink: ['/daily-question'],
				group: 'explore',
				requiresAuth: true,
			},
			{
				labelKey: 'nav.collectors',
				icon: 'pi-users',
				routerLink: ['/collectors'],
				group: 'explore',
			},
			{
				labelKey: 'nav.map',
				icon: 'pi-map-marker',
				routerLink: ['/map'],
				group: 'explore',
				requiresAuth: true,
			},
			{
				labelKey: 'nav.upcoming',
				icon: 'pi-calendar',
				routerLink: ['/upcoming'],
				group: 'explore',
			},
			{
				labelKey: 'nav.concerts',
				icon: 'pi-ticket',
				routerLink: ['/concert'],
				group: 'explore',
			},
			{
				labelKey: 'nav.network',
				icon: 'pi-sitemap',
				routerLink: ['/network'],
				group: 'explore',
			},

			// Amit a gyűjtő a katalógusba tesz vissza.
			{
				labelKey: 'nav.owned-artists',
				icon: 'pi-user-edit',
				routerLink: ['/my-bands'],
				group: 'contribute',
				requiresAuth: true,
			},
			{
				labelKey: 'nav.my-requests',
				icon: 'pi-file-edit',
				routerLink: ['/my-requests'],
				group: 'contribute',
				requiresAuth: true,
			},
		];
	}

	public imgClickHandler(): void {
		this.router.navigate(['/']);
	}

	/**
	 * A fresh object for every user: the bar reads it through a signal, and
	 * the same object with its user swapped inside would never count as a
	 * change — the bar kept whoever was signed in when the page loaded.
	 */
	public init$(): Observable<TopBarParams> {
		return this.authenticationStateService
			.selectAuthenticatedUser$()
			.pipe(map((user) => this.toParams(user)));
	}

	public selectIsAuthenticated$(): Observable<boolean> {
		return this.authenticationStateService.selectIsAuthenticated$();
	}

	public login(): void {
		this.authenticationStateService.dispatchLogin();
	}

	public logout(): void {
		this.authorizationService.removeAll();
		this.authenticationStateService.dispatchLogout();
		this.router.navigate(['/home']);
	}

	private toParams(user: User): TopBarParams {
		return {
			addPagePermissions: [],
			editPagePermissions: [],
			isAuthenticated: !!user && user.displayName !== 'GUEST',
			menuItems: this.createMenuItems(),
			user,
		};
	}
}
