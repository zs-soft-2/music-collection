import {
	CollectionItemListConfig,
	DynamicConfigEntity,
} from '@music-collection/api';

export interface CollectionContentModel {
	collectionItemListConfig: CollectionItemListConfig;
	isLoading: boolean;
}

export interface CollectionSidebarParams {
	dynamicConfig: DynamicConfigEntity;
	isConfigPanelVisible: boolean;
}
