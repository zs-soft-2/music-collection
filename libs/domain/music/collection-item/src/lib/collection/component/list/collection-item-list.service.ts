import { EventEmitter, Injectable } from '@angular/core';
import {
	BaseComponent,
	CollectionGroupByEnum,
	CollectionItemEntity,
	CollectionItemListConfig,
	CollectionItemMap,
	CollectionItemStateService,
	CollectionItemUtilService,
	MediaEnum,
} from '@music-collection/api';

@Injectable()
export class CollectionItemListService extends BaseComponent {
	private selectCollectionItem!: EventEmitter<CollectionItemEntity>;

	public init$(
		selectCollectionItem: EventEmitter<CollectionItemEntity>
	): void {
		this.selectCollectionItem = selectCollectionItem;
	}

	public collectionItemClick(collectionItem: CollectionItemEntity): void {
		this.selectCollectionItem.emit(collectionItem);
	}

	public createCollectionItemMap(
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

	public createFxLayoutValue(
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
		} else if (groupBy === CollectionGroupByEnum.year) {
			const map: Map<string, CollectionItemEntity[]> = new Map();

			entities.forEach((entity) => {
				const year = entity.release.album.year as never;
				let number = 0;

				if (year) {
					number = year['seconds'];
				}

				const date = new Date(number * 1000);
				const yearString: string = date.getFullYear().toString();

				let entities: CollectionItemEntity[] | undefined =
					map.get(yearString);

				if (!entities) {
					entities = [entity];

					map.set(yearString, entities);
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
