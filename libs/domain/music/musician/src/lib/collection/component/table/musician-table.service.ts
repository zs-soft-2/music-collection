import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	MusicianEntity,
	MusicianStateService,
	MusicianTableParams,
	sortByRecent,
} from '@music-collection/api';
import { createCollectionView } from '@music-collection/ui';

@Injectable()
export class MusicianTableService {
	private activatedRoute = inject(ActivatedRoute);
	private musicianStateService = inject(MusicianStateService);
	private router = inject(Router);
	private query$ = new BehaviorSubject('');

	public readonly collectionView = createCollectionView(
		'mc.admin.musicians.view'
	);

	public editMusician(musician: MusicianEntity): void {
		this.router.navigate(['../edit', musician.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public filter(query: string): void {
		this.query$.next(query.trim().toLowerCase());
	}

	/** Every musician (the list page resolver loads them), the last changed first, filtered by name, real name or alias. */
	public init$(): Observable<MusicianTableParams> {
		return combineLatest([
			this.musicianStateService.selectEntities$().pipe(map(sortByRecent)),
			this.musicianStateService.isLoading$(),
			this.query$,
		]).pipe(
			map(([musicians, loading, query]) => ({
				musicians: query
					? musicians.filter((musician) => matches(musician, query))
					: musicians,
				loading,
			}))
		);
	}
}

function matches(musician: MusicianEntity, query: string): boolean {
	return [musician.name, musician.realName, ...(musician.aliases ?? [])]
		.filter(Boolean)
		.some((value) => String(value).toLowerCase().includes(query));
}
