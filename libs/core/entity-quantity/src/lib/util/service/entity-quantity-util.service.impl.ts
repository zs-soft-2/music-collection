import { Injectable } from '@angular/core';
import {
	EntityQuantityEntity,
	EntityQuantityEntityAdd,
	EntityQuantityEntityUpdate,
	EntityQuantityUtilService,
	EntityTypeEnum,
} from '@music-collection/api';

@Injectable()
export class EntityQuantityUtilServiceImpl extends EntityQuantityUtilService {
	public createEntityQuantity(type: EntityTypeEnum): EntityQuantityEntity {
		return {
			group: {},
			items: [],
			modifyDate: new Date(),
			uid: type.toString(),
			quantity: 0,
			type,
		};
	}

	public createEntityQuantityItem(
		name: string,
		type: EntityTypeEnum
	): EntityQuantityEntityAdd {
		throw new Error('Method not implemented.');
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate {
		throw new Error('Method not implemented.');
	}
}
