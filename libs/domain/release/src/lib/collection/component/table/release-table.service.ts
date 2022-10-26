import { Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ReleaseEntity,
	ReleaseStateService,
	ReleaseTableParams,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ReleaseTableService extends BaseComponent {
	private params!: ReleaseTableParams;
	private params$$: ReplaySubject<ReleaseTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private releaseStateService: ReleaseStateService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editRelease(release: ReleaseEntity): void {
		this.router.navigate(['../edit', release?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<ReleaseTableParams> {
		return this.releaseStateService.selectEntities$().pipe(
			switchMap((releases) => {
				this.params = {
					releases,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}
}
