import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	MusicianEntity,
	MusicianStateService,
	MusicianTableParams,
} from '@music-collection/api';

export type MusicianTableView = 'table' | 'cards';

const VIEW_KEY = 'mc.admin.musicians.view';

function readView(): MusicianTableView {
	try {
		return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table';
	} catch {
		return 'table';
	}
}

@Injectable()
export class MusicianTableService {
	private activatedRoute = inject(ActivatedRoute);
	private musicianStateService = inject(MusicianStateService);
	private router = inject(Router);
	private query$ = new BehaviorSubject('');

	public readonly view = signal<MusicianTableView>(readView());

	public editMusician(musician: MusicianEntity): void {
		this.router.navigate(['../edit', musician.uid], {
			relativeTo: this.activatedRoute,
		});
	}

	public filter(query: string): void {
		this.query$.next(query.trim().toLowerCase());
	}

	/** Every musician (the list page resolver loads them), name order, filtered by name, real name or alias. */
	public init$(): Observable<MusicianTableParams> {
		return combineLatest([
			this.musicianStateService.selectEntities$(),
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

	public setView(view: MusicianTableView): void {
		this.view.set(view);
		try {
			localStorage.setItem(VIEW_KEY, view);
		} catch {
			// Preference is a convenience only.
		}
	}
}

function matches(musician: MusicianEntity, query: string): boolean {
	return [musician.name, musician.realName, ...(musician.aliases ?? [])]
		.filter(Boolean)
		.some((value) => String(value).toLowerCase().includes(query));
}
