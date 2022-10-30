import { Observable, ReplaySubject, Subject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { MenuItem, TopBarParams } from '../../api';
import { AuthenticationStateService, User } from '@music-collection/api';

@Injectable()
export class TopBarService {
	private currentPath!: string;
	private params!: TopBarParams;
	private params$$: Subject<TopBarParams>;

	constructor(
		private authenticationStateService: AuthenticationStateService,
		private router: Router
	) {
		this.params$$ = new ReplaySubject();
	}

	public createMenuItems(): MenuItem[] {
		return [];
	}

	public init$(): Observable<TopBarParams> {
		return this.authenticationStateService.selectAuthenticatedUser$().pipe(
			switchMap((user) => {
				this.params = {
					addPagePermissions: [],
					editPagePermissions: [],
					menuItems: this.createMenuItems(),
					user,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}
}
