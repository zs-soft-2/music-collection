import { Observable } from 'rxjs';

import { BaseService } from '../base';
import { SearchParams } from '../search';

export abstract class DataService<R, S, T> extends BaseService {
	public abstract add$(entityAdd: S): Observable<R>;
	public abstract delete$(entity: R): Observable<R>;
	public abstract list$(): Observable<R[]>;
	public abstract load$(id: string): Observable<R | undefined>;
	public abstract search$(params: SearchParams): Observable<R[]>;
	public abstract update$(entityUpdate: T): Observable<T>;
}
