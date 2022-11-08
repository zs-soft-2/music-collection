import { Subject } from 'rxjs';

import { Component, OnDestroy } from '@angular/core';

import { Entity } from '../../entity';

@Component({
	template: '',
})
export abstract class BaseComponent implements OnDestroy {
	protected destroy: Subject<boolean>;

	public constructor() {
		this.destroy = new Subject();
	}

	public ngOnDestroy(): void {
		this.destroy.next(true);
		this.destroy.complete();
	}

	public trackByEntity(index: number, entity: Entity) {
		return entity.uid;
	}
}
