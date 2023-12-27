import { EventEmitter, Injectable } from '@angular/core';
import { BaseService, CollectionItemListConfig } from '@music-collection/api';

@Injectable()
export class CollectionSidebarService extends BaseService {
	public configChange!: EventEmitter<CollectionItemListConfig>;

	public init$(configChange: EventEmitter<CollectionItemListConfig>): void {
		this.configChange = configChange;
	}

	public save(config: CollectionItemListConfig): void {
		this.configChange.emit(this.getConfig(config));
	}

	private getConfig(
		config: CollectionItemListConfig,
	): CollectionItemListConfig {
		return {
			...config,
			filterByArtistNames:
				config.filterByArtistNames &&
				config.filterByArtistNames.length === 0
					? null
					: config.filterByArtistNames,
		};
	}
}
