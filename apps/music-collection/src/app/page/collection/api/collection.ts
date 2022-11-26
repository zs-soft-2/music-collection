import {
	CollectionItemListConfig,
	DynamicConfigEntity,
} from '@music-collection/api';

export interface CollectionContentParams {
	collectionItemListConfig: CollectionItemListConfig;
}

export interface CollectionSidebarParams {
	dynamicConfig: DynamicConfigEntity;
	isConfigPanelVisible: boolean;
}
