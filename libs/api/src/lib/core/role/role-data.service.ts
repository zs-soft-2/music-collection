import { Observable } from 'rxjs';

import { EntityDataService } from '../../common';
import { Role } from './role';

export abstract class RoleDataService extends EntityDataService<
	Role,
	Role,
	Role
> {
	public abstract listByIds$(ids: string[]): Observable<Role[]>;
}
