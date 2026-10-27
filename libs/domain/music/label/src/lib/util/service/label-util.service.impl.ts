import { Injectable, inject } from '@angular/core';
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

/** One value per line in the form; blank lines are dropped. */
const toLines = (value: unknown): string[] =>
	typeof value === 'string'
		? value
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean)
		: [];

const orNull = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null;

@Injectable()
export class LabelUtilServiceImpl extends LabelUtilService {
	private formBuilder = inject(FormBuilder);

	public _sort = (a: LabelEntity, b: LabelEntity): number =>
		a.name < b.name ? 1 : -1;

	public createEntity(formGroup: FormGroup): LabelEntityAdd {
		return {
			entityType: EntityTypeEnum.Label,
			...this.formValues(formGroup),
		};
	}

	/** The whole document: an update replaces it, fields and all. */
	public updateEntity(formGroup: FormGroup): LabelEntityUpdate {
		return {
			entityType: EntityTypeEnum.Label,
			uid: formGroup.value['uid'],
			...this.formValues(formGroup),
		};
	}

	public createFormGroup(label: LabelEntity | undefined): FormGroup {
		return this.formBuilder.group({
			uid: [label?.uid],
			name: [label?.name || null, [Validators.required]],
			parent: [label?.parent || null],
			description: [label?.description || null],
			imageUrl: [
				label?.imageUrl || null,
				[Validators.pattern(/^https?:\/\/\S+$/i)],
			],
			sites: [(label?.sites ?? []).join('\n')],
			discogsId: [label?.discogsId ?? null, [Validators.min(1)]],
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
		const entity: LabelEntityUpdate & { searchParameters?: string[] } = {
			...model,
		};
		delete entity.searchParameters;

		return entity;
	}

	private formValues(formGroup: FormGroup) {
		const value = formGroup.value;
		const discogsId = Number(value['discogsId']);

		return {
			name: String(value['name'] ?? '').trim(),
			parent: value['parent'] ?? null,
			description: orNull(value['description']),
			imageUrl: orNull(value['imageUrl']),
			sites: toLines(value['sites']),
			discogsId: discogsId > 0 ? discogsId : null,
		};
	}
}
