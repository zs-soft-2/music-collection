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

	public createMenuItems(): MenuItem[] {
		return [
			{ labelKey: 'nav.home', icon: 'pi-home', routerLink: ['/home'] },
			{
				labelKey: 'nav.collection',
				icon: 'pi-th-large',
				routerLink: ['/collection'],
				requiresAuth: true,
			},
			{
				labelKey: 'nav.scan',
				icon: 'pi-camera',
				routerLink: ['/scan'],
				requiresAuth: true,
			},
			{
				labelKey: 'nav.shelf-scan',
				icon: 'pi-images',
				routerLink: ['/shelf-scan'],
				requiresAuth: true,
			},
			{
				labelKey: 'nav.collections',
				icon: 'pi-bookmark',
				routerLink: ['/collections'],
			},
			{
				labelKey: 'nav.radio',
				icon: 'pi-play-circle',
				routerLink: ['/radio'],
				requiresAuth: true,
			},
			{
				labelKey: 'nav.daily-question',
				icon: 'pi-question-circle',
				routerLink: ['/daily-question'],
				requiresAuth: true,
			},
			{
				labelKey: 'nav.upcoming',
				icon: 'pi-calendar',
				routerLink: ['/upcoming'],
			},
			{
				labelKey: 'nav.wishlist',
				icon: 'pi-heart',
				routerLink: ['/wishlist'],
				requiresAuth: true,
			},
			{
				labelKey: 'nav.network',
				icon: 'pi-sitemap',
				routerLink: ['/network'],
			},
			{
				labelKey: 'nav.map',
				icon: 'pi-map-marker',
				routerLink: ['/map'],
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
