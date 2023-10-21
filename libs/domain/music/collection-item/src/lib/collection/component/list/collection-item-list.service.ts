import { combineLatest, Observable, ReplaySubject, tap } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import { EventEmitter, Injectable } from '@angular/core';
import {
	BaseComponent,
	CollectionGroupByEnum,
	CollectionItemEntity,
	CollectionItemListConfig,
	CollectionItemListParams,
	CollectionItemMap,
	CollectionItemStateService,
	CollectionItemUtilService,
	MediaEnum,
} from '@music-collection/api';

@Injectable()
export class CollectionItemListService extends BaseComponent {
	private params!: CollectionItemListParams;
	private params$$: ReplaySubject<CollectionItemListParams>;
	private selectCollectionItem!: EventEmitter<CollectionItemEntity>;

	public constructor(
		private collectionItemStateService: CollectionItemStateService,
		private collectionItemUtilService: CollectionItemUtilService
	) {
		super();

		this.params$$ = new ReplaySubject(1);
	}

	public collectionItemClick(collectionItem: CollectionItemEntity): void {
		this.selectCollectionItem.emit(collectionItem);
	}

	public init$(
		selectCollectionItem: EventEmitter<CollectionItemEntity>
	): Observable<CollectionItemListParams> {
		this.selectCollectionItem = selectCollectionItem;

		return combineLatest([
			this.collectionItemStateService.selectEntities$().pipe(
				tap((entities) => {
					if (!entities?.length) {
						this.collectionItemStateService.dispatchListEntitiesAction();
					}
				}),
				filter((entities) => entities.length > 0)
			),
			this.collectionItemStateService.selectCollectionItemListConfig$(),
		]).pipe(
			switchMap(([entities, config]) => {
				entities = this.collectionItemUtilService.filterByArtist(
					entities,
					config?.filterByArtistNames?.map((item) => item.value) ||
						null
				);

				this.params = {
					allItems: entities.length,
					collectionItemMaps: this.createCollectionItemMap(
						this.collectionItemUtilService.sortCollectionItems(
							config?.sortBy || null,
							entities
						),
						config
					),
					fxLayoutValue: this.createFxLayoutValue(config),
				};

				this.params$$.next(this.params);

				return this.params$$.asObservable();
			})
		);
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
				collectionItemMaps: null,
				groupBy: CollectionGroupByEnum.default,
			});
		} else {
			items.push(
				...this.createGroup(
					entities,
					config.groupBy.map((item) => item.value),
					0
				)
			);
		}

		return items;
	}

	private createFxLayoutValue(
		config: CollectionItemListConfig | null
	): string {
		return !config || !config.groupBy?.length ? 'row wrap' : 'column';
	}

	private createGroup(
		entities: CollectionItemEntity[],
		groupByItems: CollectionGroupByEnum[],
		index: number
	): CollectionItemMap[] {
		const groupBy: CollectionGroupByEnum = groupByItems[index];
		const collectionItemMaps: CollectionItemMap[] = [];
		const isMoreGroupBy = !!groupByItems[index + 1];

		if (groupBy === CollectionGroupByEnum.artist) {
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
				let collectionItemList: CollectionItemEntity[] | null = null;
				let childCollectionItemMaps: CollectionItemMap[] | null = null;

				if (isMoreGroupBy) {
					childCollectionItemMaps = this.createGroup(
						entry[1],
						groupByItems,
						index + 1
					);
				} else {
					collectionItemList = entry[1];
				}

				const item: CollectionItemMap = {
					name: entry[0],
					collectionItemList,
					collectionItemMaps: childCollectionItemMaps,
					groupBy,
				};

				collectionItemMaps.push(item);
			});
		} else if (groupBy === CollectionGroupByEnum.media) {
			const map: Map<MediaEnum, CollectionItemEntity[]> = new Map();

			entities.forEach((entity) => {
				const media: MediaEnum = entity.release.media;

				let entities: CollectionItemEntity[] | undefined =
					map.get(media);

				if (!entities) {
					entities = [entity];

					map.set(media, entities);
				} else {
					entities.push(entity);
				}
			});

			Array.from(map.entries()).forEach((entry) => {
				let collectionItemList: CollectionItemEntity[] | null = null;
				let childCollectionItemMaps: CollectionItemMap[] | null = null;

				if (isMoreGroupBy) {
					childCollectionItemMaps = this.createGroup(
						entry[1],
						groupByItems,
						index + 1
					);
				} else {
					collectionItemList = entry[1];
				}

				const item: CollectionItemMap = {
					name: entry[0],
					collectionItemList,
					collectionItemMaps: childCollectionItemMaps,
					groupBy,
				};

				collectionItemMaps.push(item);
			});
		} else if (groupBy === CollectionGroupByEnum.style) {
			const map: Map<string, CollectionItemEntity[]> = new Map();

			entities.forEach((entity) => {
				const style: string = entity.release.album.styles.join('/');

				let entities: CollectionItemEntity[] | undefined =
					map.get(style);

				if (!entities) {
					entities = [entity];

					map.set(style, entities);
				} else {
					entities.push(entity);
				}
			});

			Array.from(map.entries()).forEach((entry) => {
				let collectionItemList: CollectionItemEntity[] | null = null;
				let childCollectionItemMaps: CollectionItemMap[] | null = null;

				if (isMoreGroupBy) {
					childCollectionItemMaps = this.createGroup(
						entry[1],
						groupByItems,
						index + 1
					);
				} else {
					collectionItemList = entry[1];
				}

				const item: CollectionItemMap = {
					name: entry[0],
					collectionItemList,
					collectionItemMaps: childCollectionItemMaps,
					groupBy,
				};

				collectionItemMaps.push(item);
			});
		}

		return collectionItemMaps;
	}
}
