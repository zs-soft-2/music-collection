import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemUtilService,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	User,
} from '@music-collection/api';

@Injectable()
export class CollectionItemUtilServiceImpl extends CollectionItemUtilService {
	public _sort = (a: CollectionItemEntity, b: CollectionItemEntity): number =>
		a.release.name < b.release.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public createEntity(formGroup: FormGroup): CollectionItemEntityAdd {
		return {
			release: formGroup.value['release'],
			userId: formGroup.value['userId'],
			description: formGroup.value['userId'],
			date: formGroup.value['date'],
		};
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

	public createFormGroup(collectionItem: CollectionItemEntity): FormGroup {
		throw new Error('Called an unimplemented method!');
	}

	public createFormGroupByUser(
		collectionItem: CollectionItemEntity,
		authenticatedUser: User | undefined
	): FormGroup {
		return this.formBuilder.group({
			uid: [collectionItem?.uid],
			userId: [collectionItem?.userId || authenticatedUser?.uid],
			date: [collectionItem?.date || null, [Validators.required]],
			release: [collectionItem?.release || null, [Validators.required]],
			description: [collectionItem?.description || null],
		});
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate {
		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + 1,
		};
	}
}
