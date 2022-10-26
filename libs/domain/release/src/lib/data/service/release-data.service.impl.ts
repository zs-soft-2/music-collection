import { nanoid } from 'nanoid';
import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	ReleaseDataService,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class ReleaseDataServiceImpl extends ReleaseDataService {
	protected releaseCollection: ReleaseEntity[];

	public constructor() {
		super();

		this.releaseCollection = [];
	}

	public add$(release: ReleaseEntityAdd): Observable<ReleaseEntity> {
		const newRelease: ReleaseEntity = {
			...release,
			uid: nanoid(),
		};

		this.releaseCollection = this.releaseCollection.concat([newRelease]);

		return of(newRelease);
	}

	public delete$(release: ReleaseEntity): Observable<ReleaseEntity> {
		return of(release);
	}

	public list$(): Observable<ReleaseEntity[]> {
		return of(this.releaseCollection);
	}

	public listByIds$(ids: string[]): Observable<ReleaseEntity[]> {
		const listByIds: ReleaseEntity[] = [];

		return of(
			this.releaseCollection.reduce(
				(list: ReleaseEntity[], release: ReleaseEntity) => {
					if (ids.includes(release.uid)) {
						list.push(release);
					}

					return list;
				},
				listByIds
			)
		);
	}

	public load$(uid: string): Observable<ReleaseEntity | undefined> {
		return of(
			this.releaseCollection.find((release) => release.uid === uid)
		);
	}

	public search$(query: string): Observable<ReleaseEntity[]> {
		const foundByQuery: ReleaseEntity[] = [];

		return of(
			this.releaseCollection.reduce(
				(list: ReleaseEntity[], release: ReleaseEntity) => {
					if (
						release.name.toLowerCase().search(query.toLowerCase()) >
						-1
					) {
						list.push(release);
					}

					return list;
				},
				foundByQuery
			)
		);
	}

	public update$(
		release: ReleaseEntityUpdate
	): Observable<ReleaseEntityUpdate> {
		this.releaseCollection = this.releaseCollection.map((oldRelease) => {
			return (
				oldRelease.uid === release.uid
					? {
							...oldRelease,
							...release,
					  }
					: oldRelease
			) as ReleaseEntity;
		});

		return of(release);
	}
}
