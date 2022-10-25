import { nanoid } from 'nanoid';
import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import {
	LabelDataService,
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class LabelDataServiceImpl extends LabelDataService {
	protected labelCollection: LabelEntity[];

	public constructor() {
		super();

		this.labelCollection = [];
	}

	public add$(label: LabelEntityAdd): Observable<LabelEntity> {
		const newLabel: LabelEntity = {
			...label,
			uid: nanoid(),
		};

		this.labelCollection = this.labelCollection.concat([newLabel]);

		return of(newLabel);
	}

	public delete$(label: LabelEntity): Observable<LabelEntity> {
		return of(label);
	}

	public list$(): Observable<LabelEntity[]> {
		return of(this.labelCollection);
	}

	public listByIds$(ids: string[]): Observable<LabelEntity[]> {
		const listByIds: LabelEntity[] = [];

		return of(
			this.labelCollection.reduce(
				(list: LabelEntity[], label: LabelEntity) => {
					if (ids.includes(label.uid)) {
						list.push(label);
					}

					return list;
				},
				listByIds
			)
		);
	}

	public load$(uid: string): Observable<LabelEntity | undefined> {
		return of(this.labelCollection.find((label) => label.uid === uid));
	}

	public search$(query: string): Observable<LabelEntity[]> {
		const foundByQuery: LabelEntity[] = [];

		return of(
			this.labelCollection.reduce(
				(list: LabelEntity[], label: LabelEntity) => {
					if (
						label.name.toLowerCase().search(query.toLowerCase()) >
						-1
					) {
						list.push(label);
					}

					return list;
				},
				foundByQuery
			)
		);
	}

	public update$(label: LabelEntityUpdate): Observable<LabelEntityUpdate> {
		this.labelCollection = this.labelCollection.map((oldLabel) => {
			return (
				oldLabel.uid === label.uid
					? {
							...oldLabel,
							...label,
					  }
					: oldLabel
			) as LabelEntity;
		});

		return of(label);
	}
}
