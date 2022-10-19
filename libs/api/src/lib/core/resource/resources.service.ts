import { KeyValue } from '@angular/common';

import { BaseService } from '../../common';
import { Resource } from './resource';
import { ResourceEnum } from './resource.enum';

export abstract class ResourcesService extends BaseService {
  public static resources: KeyValue<string, Resource>[] = [
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

  public static addResources(resources: KeyValue<string, Resource>[]): void {
    ResourcesService.resources.push(...resources);
  }
}
