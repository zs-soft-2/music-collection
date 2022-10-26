import { ReplaySubject, Subject } from 'rxjs';

import { BaseComponent } from './base.component';

export abstract class ParamsBaseComponent<T> extends BaseComponent {
	protected params!: T;

	public params$$!: Subject<T>;

	constructor() {
		super();

		this.params$$ = new ReplaySubject();
	}
}
