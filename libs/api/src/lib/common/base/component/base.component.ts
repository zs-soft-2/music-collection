import { Subject } from 'rxjs';

import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Entity } from '@music-collection/common/api';

@Component({
	template: '',
	// Az Angular 22 migrációja tette ide, a 22 előtti változásdetektálás
	// megőrzésére. OnPush-ra váltása az egész appra kiható viselkedésváltozás,
	// ezért itt szándékosan nem követjük a szabályt.
	// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
	changeDetection: ChangeDetectionStrategy.Eager,
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
