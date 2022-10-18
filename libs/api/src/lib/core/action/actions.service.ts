import { KeyValue } from '@angular/common';
import { Injectable } from '@angular/core';

import { BaseService } from '../../common';
import { Action } from './action';
import { ActionEnum } from './action.enum';

@Injectable()
export abstract class ActionsService extends BaseService {
  public static actions: KeyValue<string, Action>[] = [
    {
      key: ActionEnum.ALL.toString(),
      value: {
        name: ActionEnum.ALL.toString(),
      },
    },
    {
      key: ActionEnum.CREATE.toString(),
      value: {
        name: ActionEnum.CREATE.toString(),
      },
    },
    {
      key: ActionEnum.DELETE.toString(),
      value: {
        name: ActionEnum.DELETE.toString(),
      },
    },
    {
      key: ActionEnum.VIEW.toString(),
      value: {
        name: ActionEnum.VIEW.toString(),
      },
    },
    {
      key: ActionEnum.SOME.toString(),
      value: {
        name: ActionEnum.SOME.toString(),
      },
    },
  ];

  public static addActions(actions: KeyValue<string, Action>[]): void {
    actions.push(...actions);
  }
}
