import { Observable } from 'rxjs';

import { BaseService } from '../../../common';
import { EffectivePermissions } from '../effective-permissions';

/**
 * A user effektív jogosultságainak adatelérése. Élő listener: a szerepkör
 * megváltozása újratöltés nélkül is megjelenik.
 */
export abstract class EffectivePermissionsDataService extends BaseService {
	public abstract load$(
		uid: string
	): Observable<EffectivePermissions | undefined>;
}
