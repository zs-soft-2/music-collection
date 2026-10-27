import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	MusicianEntity,
	MusicianStateService,
	MusicianTableParams,
	sortByRecent,
} from '@music-collection/api';
import {
	createCollectionPlace,
	createCollectionView,
} from '@music-collection/ui';

@Injectable()
export class MusicianTableService {
	private activatedRoute = inject(ActivatedRoute);
	private musicianStateService = inject(MusicianStateService);
	private router = inject(Router);

	public readonly collectionView = createCollectionView(
		'mc.admin.musicians.view'
	);

	public readonly place = createCollectionPlace('mc.admin.musicians', {
		cards: 48,
		table: 50,
	});

	/** The query the list is narrowed by, taken up again where it was left. */
	private query$ = new BehaviorSubject(this.place.filterOf('name'));

	public editMusician(musician: MusicianEntity): void {
		this.router.navigate(['../edit', musician.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	/**
	 * The page the musician is read on, as anyone else sees it —
	 * the admin list's way of looking rather than editing.
	 */
	public viewLink(musician: MusicianEntity): unknown[] {
		return ['/musician', musician.uid];
	}

	public filter(query: string): void {
		this.place.setFilter('name', query);
		this.query$.next(query);
	}

	/** Every musician (the list page resolver loads them), the last changed first, filtered by name, real name or alias. */
	public init$(): Observable<MusicianTableParams> {
		return combineLatest([
			this.musicianStateService.selectEntities$().pipe(map(sortByRecent)),
			this.musicianStateService.isLoading$(),
			this.query$.pipe(map((query) => query.trim().toLowerCase())),
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
