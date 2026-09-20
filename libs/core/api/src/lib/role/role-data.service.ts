import { Observable } from 'rxjs';

import { EntityDataService } from '@music-collection/common-api';
import { Role } from './role';

export abstract class RoleDataService extends EntityDataService<
	Role,
	Role,
	Role
> {
	public abstract listByIds$(ids: string[]): Observable<Role[]>;
}
