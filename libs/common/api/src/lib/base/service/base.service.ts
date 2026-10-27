import { Subject } from 'rxjs';

export abstract class BaseService {
	protected destroy: Subject<boolean>;

	public constructor() {
		this.destroy = new Subject();
	}

	public onDestroy(): void {
		this.destroy.next(true);
		this.destroy.complete();
	}
}
