import { Observable, combineLatest, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	MusicianEntity,
	MusicianStateService,
	MusicianTableParams,
} from '@music-collection/api';

@Injectable()
export class MusicianTableService {
	private activatedRoute = inject(ActivatedRoute);
	private musicianStateService = inject(MusicianStateService);
	private router = inject(Router);

	public editMusician(musician: MusicianEntity): void {
		this.router.navigate(['../edit', musician.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/** Every musician (the list page resolver loads them), name order. */
	public init$(): Observable<MusicianTableParams> {
		return combineLatest([
			this.musicianStateService.selectEntities$(),
			this.musicianStateService.isLoading$(),
		]).pipe(map(([musicians, loading]) => ({ musicians, loading })));
	}
}
