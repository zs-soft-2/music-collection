import { Observable } from 'rxjs';

import { BaseService } from '../../common';
import { User } from '../user';

export abstract class AuthenticationStateService extends BaseService {
	public abstract dispatchAuthenticated(user: User | undefined): void;
	public abstract dispatchGetUser(): void;
	public abstract dispatchLogin(): void;
	public abstract dispatchLogout(): void;
	public abstract selectAuthenticatedUser$(): Observable<User | undefined>;
	public abstract selectIsAuthenticated$(): Observable<boolean>;
}
