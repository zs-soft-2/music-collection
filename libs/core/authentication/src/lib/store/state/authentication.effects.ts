import { from, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap, take } from 'rxjs/operators';
import {
	Auth,
	authState,
	GoogleAuthProvider,
	signInWithPopup,
	signOut,
} from '@angular/fire/auth';

import { inject, Injectable } from '@angular/core';
import {
	BaseService,
	EntityTypeEnum,
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
	// Az injektálási kontextusban kell létrehozni (AngularFire).
	private readonly authState$ = authState(this.auth);

	// Oldal-újratöltéskor a Firebase aszinkron állítja vissza a munkamenetet.
	// A munkamenet igazságforrása a Firebase (nem a localStorage-ba mentett
	// állapot): ha van visszaállított user, betöltjük, különben vendég lesz.
	restoreSession$ = createEffect(() =>
		this.authState$.pipe(
			take(1),
			map((firebaseUser) =>
				firebaseUser
					? authenticationActions.getUser()
					: authenticationActions.logoutSuccess()
			)
		)
	);
	getAuthenticatedUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(authenticationActions.getUser),
			mergeMap(() => {
				const authData = this.auth.currentUser;
				const actions: any[] = [];

				// eslint-disable-next-line no-constant-condition
				if (authData) {
					// Szerepkört NEM teszünk a user dokumentumba: a rules
					// tiltja, hogy valaki magának adjon (`roles`/`roleIds`), és
					// a jogosultság forrása amúgy is az effective_permissions
					// dokumentum. Emiatt hasalt el eddig az első bejelentkezés
					// user-dokumentum létrehozása.
					const user: User = {
						displayName: authData.displayName,
						email: authData.email,
						entityType: EntityTypeEnum.User,
						firstName: '',
						lastName: '',
						phone: '',
						photoURL: authData.photoURL,
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
			switchMap(() =>
				// A catchError a belső folyamon van: így egy sikertelen
				// kijelentkezés nem állítja le véglegesen az effektet.
				from(signOut(this.auth)).pipe(
					map(() => authenticationActions.logoutSuccess()),
					catchError((err) =>
						of(
							authenticationActions.authError({
								error: err.message,
							})
						)
					)
				)
			)
		)
	);

	private googleLogin(): Promise<unknown> {
		return signInWithPopup(this.auth, new GoogleAuthProvider());
	}
}
