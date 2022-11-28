import { map, Observable, of, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	BaseComponent,
	ReleaseEntity,
	ReleaseListParams,
	ReleaseStateService,
} from '@music-collection/api';

@Injectable()
export class ReleaseListService extends BaseComponent {
	private params!: ReleaseListParams;
	private params$$: ReplaySubject<ReleaseListParams>;

	public constructor(private releaseStateService: ReleaseStateService) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(): Observable<ReleaseListParams> {
		return this.releaseStateService.selectEntities$().pipe(
			map((releases) => this.shuffleArray(releases)),
			switchMap((releases) => {
				this.params = {
					releases,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	private shuffleArray(array: ReleaseEntity[]): ReleaseEntity[] {
		let size = array.length,
			t,
			i;

		while (size) {
			i = Math.floor(Math.random() * size--);
			t = array[size];
			array[size] = array[i];
			array[i] = t;
		}

		return array;
	}
}
