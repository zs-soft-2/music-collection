import { AUTHENTICATION_FEATURE_KEY, User } from '@music-collection/api';
import { createReducer, on } from '@ngrx/store';

import * as authenticationActions from './authentication.actions';

export interface AuthenticationState {
  authenticatedUser: User | undefined;
  loading: boolean;
  error: string | null;
}

export interface AuthenticationPartialState {
  readonly [AUTHENTICATION_FEATURE_KEY]: AuthenticationState;
}

const defaultUser: User = {
  uid: 'guest-1',
  displayName: 'GUEST',
  email: null,
  photoURL: null,
};

export const authenticationReducer = createReducer(
  { authenticatedUser: defaultUser, loading: false },
  on(authenticationActions.getUser, (state) => ({ ...state, loading: true })),
  on(authenticationActions.authenticated, (state, { user }) => ({
    ...state,
    authenticatedUser: user,
    loading: false,
  })),
  on(authenticationActions.notAuthenticated, (state) => {
    return {
      ...state,
      authenticatedUser: defaultUser,
      loading: false,
    };
  }),
  on(authenticationActions.logoutSuccess, (state) => {
    return {
      ...state,
      authenticatedUser: defaultUser,
      loading: false,
    };
  }),
  on(authenticationActions.login, (state) => ({
    ...state,
    loading: true,
  })),
  on(authenticationActions.authError, (state) => ({
    ...state,
    authenticatedUser: defaultUser,
    loading: false,
  }))
);
