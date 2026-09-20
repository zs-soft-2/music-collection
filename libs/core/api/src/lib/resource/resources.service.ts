import { BaseService, KeyValuePair } from '@music-collection/common-api';

import { Resource } from './resource';
import { ResourceEnum } from './resource.enum';

export abstract class ResourcesService extends BaseService {
	public static resources: KeyValuePair<string, Resource>[] = [
		{
			key: ResourceEnum.ALL.toString(),
			value: {
				name: ResourceEnum.ALL.toString(),
			},
		},
		{
			key: ResourceEnum.SOME.toString(),
			value: {
				name: ResourceEnum.SOME.toString(),
			},
		},
	];

	public static addResources(resources: KeyValuePair<string, Resource>[]): void {
		ResourcesService.resources.push(...resources);
	}
}
