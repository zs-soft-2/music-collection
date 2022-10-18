import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { AuthenticationStateService, User } from '@music-collection/api';
import { select, Store } from '@ngrx/store';

import * as authenticationActions from './authentication.actions';
import { AuthenticationPartialState } from './authentication.reducer';
import * as authenticationSelectors from './authentication.selectors';

@Injectable()
export class AuthenticationStateServiceImpl extends AuthenticationStateService {
  public constructor(private store: Store<AuthenticationPartialState>) {
    super();
  }

  public dispatchAuthenticated(user: User): void {
    this.store.dispatch(authenticationActions.authenticated({ user }));
  }

  public dispatchGetUser(): void {
    this.store.dispatch(authenticationActions.getUser());
  }

  public dispatchGoogleLogin(): void {
    this.store.dispatch(authenticationActions.googleLogin());
  }

  public dispatchLogin(): void {
    throw new Error('Method not implemented.');
  }

  public dispatchLogout(): void {
    this.store.dispatch(authenticationActions.logout());
  }

  public selectAuthenticatedUser$(): Observable<User | undefined> {
    return this.store.pipe(
      select(authenticationSelectors.selectAuthenticatedUser)
    );
  }

  public selectIsAuthenticated$(): Observable<boolean> {
    return this.store.pipe(
      select(authenticationSelectors.selectIsAuthenticated)
    );
  }
}
