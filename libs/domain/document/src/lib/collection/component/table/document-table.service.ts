import { Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	DocumentEntity,
	DocumentStateService,
	DocumentTableParams,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class DocumentTableService extends BaseComponent {
	private params!: DocumentTableParams;
	private params$$: ReplaySubject<DocumentTableParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private documentStateService: DocumentStateService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public editDocument(document: DocumentEntity): void {
		this.router.navigate(['../edit', document?.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<DocumentTableParams> {
		return this.documentStateService.selectEntities$().pipe(
			switchMap((documents) => {
				this.params = {
					documents,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}
}
