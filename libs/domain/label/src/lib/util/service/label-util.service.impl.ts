import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
	LabelUtilService,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	LabelModelAdd,
	LabelModel,
	LabelModelUpdate,
	EntityTypeEnum,
} from '@music-collection/api';

@Injectable()
export class LabelUtilServiceImpl extends LabelUtilService {
	public _sort = (a: LabelEntity, b: LabelEntity): number =>
		a.name < b.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public createEntity(formGroup: FormGroup): LabelEntityAdd {
		return {
			entityType: EntityTypeEnum.Label,
			name: formGroup.value['name'],
			parent: formGroup.value['parent'],
		};
	}

	public updateEntity(formGroup: FormGroup): LabelEntityUpdate {
		return {
			entityType: EntityTypeEnum.Label,
			uid: formGroup.value['uid'],
			name: formGroup.value['name'],
			parent: formGroup.value['parent'],
		};
	}

	public createFormGroup(label: LabelEntity | undefined): FormGroup {
		return this.formBuilder.group({
			uid: [label?.uid],
			name: [label?.name || null, [Validators.required]],
			parent: [label?.parent || null],
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

	public convertEntityAddToModelAdd(entity: LabelEntityAdd): LabelModelAdd {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityToModel(entity: LabelEntity): LabelModel {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: LabelEntityUpdate
	): LabelModelUpdate {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name || ''),
		};
	}

	public convertModelAddToEntityAdd(model: LabelModelAdd): LabelEntityAdd {
		return {
			...model,
		};
	}

	public convertModelToEntity(model: LabelModel): LabelEntity {
		return {
			...model,
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: LabelModelUpdate
	): LabelEntityUpdate {
		const entity: LabelEntityUpdate = {
			uid: model.uid,
			entityType: model.entityType,
		};

		if (model.name) {
			entity.name = model.name;
		}

		if (model.parent) {
			entity.parent = model.parent;
		}

		return entity;
	}
}
