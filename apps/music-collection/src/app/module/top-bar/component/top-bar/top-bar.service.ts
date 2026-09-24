import { Observable, ReplaySubject, Subject, switchMap } from 'rxjs';

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

	private currentPath!: string;
	private params!: TopBarParams;
	private params$$: Subject<TopBarParams>;

	constructor() {
		this.params$$ = new ReplaySubject();
	}

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

	public init$(): Observable<TopBarParams> {
		return this.authenticationStateService.selectAuthenticatedUser$().pipe(
			switchMap((user) => {
				this.params = this.updateParams(this.params, user);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
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

	private updateParams(params: TopBarParams, user: User): TopBarParams {
		let newParams: TopBarParams;

		if (!params) {
			newParams = {
				addPagePermissions: [],
				editPagePermissions: [],
				isAuthenticated: user && user.displayName !== 'GUEST',
				menuItems: this.createMenuItems(),
				user,
			};
		} else {
			params.user = user;

			newParams = params;
		}

		return newParams;
	}
}
