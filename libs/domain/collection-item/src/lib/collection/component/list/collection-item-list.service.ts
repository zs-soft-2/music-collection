import { combineLatest, Observable, ReplaySubject, tap } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	BaseComponent,
	CollectionGroupByEnum,
	CollectionItemEntity,
	CollectionItemListConfig,
	CollectionItemListParams,
	CollectionItemMap,
	CollectionItemStateService,
} from '@music-collection/api';

@Injectable()
export class CollectionItemListService extends BaseComponent {
	private params!: CollectionItemListParams;
	private params$$: ReplaySubject<CollectionItemListParams>;

	public constructor(
		private collectionItemStateService: CollectionItemStateService
	) {
		super();

		this.params$$ = new ReplaySubject(1);
	}

	public init$(): Observable<CollectionItemListParams> {
		return combineLatest([
			this.collectionItemStateService.selectEntities$().pipe(
				tap((entities) => {
					if (!entities?.length) {
						this.collectionItemStateService.dispatchListEntitiesAction();
					}
				}),
				filter((entities) => entities.length > 0),
				map((entities) => this.shuffleArray(entities))
			),
			this.collectionItemStateService.selectCollectionItemListConfig$(),
		]).pipe(
			switchMap(([entities, config]) => {
				this.params = {
					collectionItemMap: this.createCollectionItemMap(
						entities,
						config
					),
					fxLayoutValue: this.createFxLayoutValue(config),
				};

				this.params$$.next(this.params);

				return this.params$$.asObservable();
			})
		);
	}

	private createFxLayoutValue(
		config: CollectionItemListConfig | null
	): string {
		return !config || !config.groupBy?.length ? 'row wrap' : 'column';
	}

	private createCollectionItemMap(
		entities: CollectionItemEntity[],
		config: CollectionItemListConfig | null
	): CollectionItemMap[] {
		const items: CollectionItemMap[] = [];

		if (!config || !config.groupBy || !config.groupBy.length) {
			items.push({
				name: '',
				collectionItemList: entities,
				collectionItemMap: null,
				groupBy: CollectionGroupByEnum.default,
			});
		} else if (config.groupBy?.includes(CollectionGroupByEnum.artist)) {
			const map: Map<string, CollectionItemEntity[]> = new Map();

			entities.forEach((entity) => {
				const artistName: string = entity.release.artist.name;

				let entities: CollectionItemEntity[] | undefined =
					map.get(artistName);

				if (!entities) {
					entities = [entity];

					map.set(artistName, entities);
				} else {
					entities.push(entity);
				}
			});

			Array.from(map.entries()).forEach((entry) => {
				items.push({
					name: entry[0],
					collectionItemList: entry[1],
					collectionItemMap: null,
					groupBy: CollectionGroupByEnum.artist,
				});
			});
		}

		return items;
	}

	private shuffleArray(
		array: CollectionItemEntity[]
	): CollectionItemEntity[] {
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
