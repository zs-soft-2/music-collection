import { of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { BaseService, User, UserStateService } from '@music-collection/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import * as authenticationActions from './authentication.actions';

@Injectable()
export class AuthenticationEffects extends BaseService {
  getAuthenticatedUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(authenticationActions.getUser),
      mergeMap(() => {
        const actions: any[] = [];

        // eslint-disable-next-line no-constant-condition
        if (true) {
          const user: User = {
            displayName: 'Zsagia',
            email: 'zsagia@gmail.com',
            firstName: '',
            lastName: '',
            phone: '',
            photoURL: '',
            roles: [],
            uid: 'a1b2c3',
          };

          this.userStateService.dispatchLoadExistedUserAction(user);
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
      ofType(authenticationActions.googleLogin),
      switchMap(() => {
        return of({});
      }),
      map(() => {
        return authenticationActions.getUser();
      }),
      catchError((err) => {
        return of(authenticationActions.authError({ error: err.message }));
      })
    )
  );
  public logout = createEffect(() =>
    this.actions$.pipe(
      ofType(authenticationActions.logout),
      map(() => {
        return authenticationActions.logoutSuccess();
      }),
      catchError((err) =>
        of(authenticationActions.authError({ error: err.message }))
      )
    )
  );

  public constructor(
    private actions$: Actions,
    private userStateService: UserStateService
  ) {
    super();
  }
}
