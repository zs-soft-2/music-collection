import { from, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';

import { inject, Injectable } from '@angular/core';
import {
	BaseService,
	EntityTypeEnum,
	RoleNames,
	User,
	UserStateService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as authenticationActions from './authentication.actions';

@Injectable()
export class AuthenticationEffects extends BaseService {
  actions$: Actions = inject(Actions);
  auth: Auth = inject(Auth);
  userStateService: UserStateService = inject(UserStateService);
	getAuthenticatedUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(authenticationActions.getUser),
			mergeMap(() => {
				const authData = this.auth.currentUser;
				const actions: any[] = [];

				// eslint-disable-next-line no-constant-condition
				if (authData) {
					const user: User = {
						displayName: authData.displayName,
						email: authData.email,
						entityType: EntityTypeEnum.User,
						firstName: '',
						lastName: '',
						phone: '',
						photoURL: authData.photoURL,
						roles: [
							{
								uid: 'role-2',
								name: RoleNames.USER,
								permissions: [],
							},
						],
						uid: authData.uid || '12345',
					};

					this.userStateService.dispatchLoadExistedUserAction(user);

					actions.push(authenticationActions.authenticated({ user }));
				} else {
					actions.push(authenticationActions.notAuthenticated());
				}

				return actions;
			}),
			catchError((err) =>
				of(authenticationActions.authError({ error: err.message }))
			)
		)
	);
	public login = createEffect(() =>
		this.actions$.pipe(
			ofType(authenticationActions.login),
			switchMap(() => {
				return from(this.googleLogin());
			}),
			map(() => {
				return authenticationActions.getUser();
			}),
			catchError((err) => {
				return of(
					authenticationActions.authError({ error: err.message })
				);
			})
		)
	);
	public logout = createEffect(() =>
		this.actions$.pipe(
			ofType(authenticationActions.logout),
			map(() => {
				this.auth;
				return authenticationActions.logoutSuccess();
			}),
			catchError((err) =>
				of(authenticationActions.authError({ error: err.message }))
			)
		)
	);

	private googleLogin(): Promise<unknown> {
		return signInWithPopup(this.auth, new GoogleAuthProvider());
	}
}
