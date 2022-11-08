import { Observable, ReplaySubject, Subject } from 'rxjs';

import { BaseService } from './base.service';

export abstract class ComponentBaseService<T> extends BaseService {
	protected params!: T;
	protected params$$: Subject<T>;

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public abstract init$(): Observable<T>;
}
