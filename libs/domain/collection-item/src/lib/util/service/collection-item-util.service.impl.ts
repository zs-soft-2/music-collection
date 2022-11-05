import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
	CollectionItemUtilService,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityQuantityGroup,
	EntityTypeEnum,
	User,
} from '@music-collection/api';

@Injectable()
export class CollectionItemUtilServiceImpl extends CollectionItemUtilService {
	public _sort = (a: CollectionItemEntity, b: CollectionItemEntity): number =>
		a.release.name < b.release.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public convertEntityAddToModelAdd(
		entity: CollectionItemEntityAdd
	): CollectionItemModelAdd {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(
				entity.release.name || ''
			),
		};
	}

	public convertEntityToModel(
		entity: CollectionItemEntity
	): CollectionItemModel {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(
				entity.release.name || ''
			),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: CollectionItemEntityUpdate
	): CollectionItemModelUpdate {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(
				entity.release?.name || ''
			),
		};
	}

	public convertModelAddToEntityAdd(
		model: CollectionItemModelAdd
	): CollectionItemEntityAdd {
		return {
			...model,
			date: new Date(model.date),
		};
	}

	public convertModelToEntity(
		model: CollectionItemModel
	): CollectionItemEntity {
		return {
			...model,
			date: new Date(model.date),
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: CollectionItemModelUpdate
	): CollectionItemEntityUpdate {
		const entity: CollectionItemEntityUpdate = {
			uid: model.uid,
		};

		if (model.date) {
			entity.date = new Date(model.date);
		}

		if (model.description) {
			entity.description = model.description;
		}

		if (model.release) {
			entity.release = model.release;
		}

		if (model.userId) {
			entity.userId = model.userId;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): CollectionItemEntityAdd {
		return {
			release: formGroup.value['release'],
			userId: formGroup.value['userId'],
			description: formGroup.value['userId'],
			date: formGroup.value['date'],
		};
	}

	public createFormGroup(collectionItem: CollectionItemEntity): FormGroup {
		throw new Error('Called an unimplemented method!');
	}

	public createFormGroupByUser(
		collectionItem: CollectionItemEntity,
		authenticatedUser: User
	): FormGroup {
		return this.formBuilder.group({
			uid: [collectionItem?.uid],
			userId: [collectionItem?.userId || authenticatedUser?.uid],
			date: [collectionItem?.date || null, [Validators.required]],
			release: [collectionItem?.release || null, [Validators.required]],
			description: [collectionItem?.description || null],
		});
	}

	public updateEntity(formGroup: FormGroup): CollectionItemEntityUpdate {
		return {
			uid: formGroup.value['uid'],
			release: formGroup.value['release'],
			userId: formGroup.value['userId'],
			description: formGroup.value['userId'],
			date: formGroup.value['date'],
		};
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity,
		collectionItem: CollectionItemEntity
	): EntityQuantityEntityUpdate {
		const group: object = { ...entityQuantity.group };
		const userGroup = (group as any)[EntityTypeEnum.User]
			? { ...(group as any)[EntityTypeEnum.User] }
			: {};
		const userProperty = userGroup[collectionItem.userId || ''] || 0;

		userGroup[collectionItem.userId || ''] = userProperty + 1;

		(group as any)[EntityTypeEnum.User] = userGroup;

		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + 1,
			group: group as EntityQuantityGroup,
		};
	}
}
