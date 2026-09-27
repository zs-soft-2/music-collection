import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { inject, Injectable } from '@angular/core';
import {
	AuthenticationStateService,
	User,
	UserDataService,
} from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as UserActions from './user.actions';

@Injectable()
export class UserEffects {
	private authenticationService = inject(AuthenticationStateService);
	private userDataService = inject(UserDataService);

	actions$: Actions = inject(Actions);
	addUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(UserActions.addUser),
			switchMap((action) =>
				this.userDataService.add$(action.user).pipe(
					map((user) => {
						return UserActions.addUserSuccess({ user });
					}),
					catchError((error) => {
						return of(UserActions.addUserFail({ error }));
					})
				)
			)
		)
	);
	loadExistedUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(UserActions.loadExistedUser),
			switchMap((action) =>
				// A `loadExisting$` egyszer olvas, és onnan, ahol az igazság
				// van: a szerverről. A `load$` listener a helyi cache-ből
				// válaszol előbb, és egy cache, ami ezt a gyűjtőt még sosem
				// látta, nem létezőnek mondja — amire a belépés nekiállna
				// létrehozni a meglévő dokumentum fölé.
				this.userDataService.loadExisting$(action.user.uid || '').pipe(
					map((user) => {
						if (user && user.uid) {
							// A jogosultságokat nem innen töltjük: a beágyazott
							// `roles` a rules számára láthatatlan másolat volt.
							// A permissionök forrása az effective_permissions
							// dokumentum (CoreAuthorizationStoreModule).
							this.authenticationService.dispatchAuthenticated(
								user
							);

							return UserActions.loadExistedUserSuccess({ user });
						} else {
							return UserActions.addUser({
								user: action.user as User,
							});
						}
					}),
					catchError((error) => {
						return of(UserActions.loadExistedUserFail({ error }));
					})
				)
			)
		)
	);
	loadUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(UserActions.loadUser),
			switchMap((action) =>
				this.userDataService.load$(action.uid).pipe(
					map((user) => {
						return UserActions.loadUserSuccess({ user });
					}),
					catchError((error) => {
						return of(UserActions.loadUserFail({ error }));
					})
				)
			)
		)
	);
	loadUsers$ = createEffect(() =>
		this.actions$.pipe(
			ofType(UserActions.loadUsers),
			switchMap((action) =>
				this.userDataService.list$().pipe(
					map((users) => {
						return UserActions.loadUsersSuccess({
							users: users as User[],
						});
					}),
					catchError((error) => {
						return of(UserActions.loadUsersFail({ error }));
					})
				)
			)
		)
	);
	updateUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(UserActions.updateUser),
			switchMap((action) =>
				this.userDataService.update$(action.user).pipe(
					map((user) => {
						return UserActions.updateUserSuccess({
							user: {
								changes: { ...user },
								id: (user && user.uid) || '',
							},
						});
					}),
					catchError((error) => {
						return of(UserActions.updateUserFail({ error }));
					})
				)
			)
		)
	);
}
