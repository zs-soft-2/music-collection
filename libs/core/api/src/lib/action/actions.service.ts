import { BaseService, KeyValuePair } from '@music-collection/common/api';

import { Action } from './action';
import { ActionEnum } from './action.enum';

export abstract class ActionsService extends BaseService {
	public static actions: KeyValuePair<string, Action>[] = [
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

	public static addActions(actions: KeyValuePair<string, Action>[]): void {
		actions.push(...actions);
	}
}
