import { Observable, ReplaySubject, Subject } from 'rxjs';

import { BaseService } from './base.service';

export abstract class ComponentBaseService<S, T> extends BaseService {
	protected params!: S;
	protected params$$!: Subject<T>;

	public constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}

	public abstract init$(): Observable<S>;
}
