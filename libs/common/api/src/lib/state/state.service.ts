import { Observable } from 'rxjs';

import { BaseService } from '../base';

export abstract class StateService extends BaseService {
	public abstract isLoading$(): Observable<boolean>;
}
