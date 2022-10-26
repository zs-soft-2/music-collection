import { Observable } from 'rxjs';

import { EntityStateService } from '../../common';
import { Role } from './role';

export abstract class RoleStateService extends EntityStateService<
	Role,
	Role,
	Role
> {
	public constructor() {
		super();
	}

	public abstract dispatchChangeNewEntityButtonEnabled(
		enabled: boolean
	): void;
	public abstract selectNewEntityButtonEnabled$(): Observable<boolean>;
}
