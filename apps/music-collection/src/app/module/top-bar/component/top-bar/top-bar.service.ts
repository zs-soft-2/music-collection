import { Observable, ReplaySubject, Subject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
	AuthenticationStateService,
	AuthorizationService,
	User,
} from '@music-collection/api';

import { MenuItem, TopBarParams } from '../../api';

@Injectable()
export class TopBarService {
	private currentPath!: string;
	private params!: TopBarParams;
	private params$$: Subject<TopBarParams>;

	constructor(
		private authenticationStateService: AuthenticationStateService,
		private authorizationService: AuthorizationService,
		private router: Router
	) {
		this.params$$ = new ReplaySubject();
	}

	public createMenuItems(): MenuItem[] {
		return [];
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
