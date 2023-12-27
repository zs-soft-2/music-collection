import {
	CollectionItemListConfig,
} from '@music-collection/api';

export interface CollectionContentModel {
	collectionItemListConfig: CollectionItemListConfig;
	isLoading: boolean;
}
