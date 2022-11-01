import * as objectHash from 'object-hash';

import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
	DocumentModel,
	DocumentModelAdd,
	DocumentModelUpdate,
	DocumentUtilService,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
} from '@music-collection/api';

@Injectable()
export class DocumentUtilServiceImpl extends DocumentUtilService {
	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public _sort(a: DocumentEntity, b: DocumentEntity): number {
		return a.name < b.name ? 1 : -1;
	}

	public createEntity(formGroup: FormGroup): DocumentEntityAdd {
		return {
			name: (formGroup.value['name'] as string).trim(),
			filePath: formGroup.value['filePath'],
			originalName: formGroup.value['originalName'],
			fileType: formGroup.value['fileType'],
		};
	}

	public createFilePath(data: string, folder: string = '/'): string {
		return folder + objectHash(data);
	}

	public createFormGroup(release: DocumentEntity | undefined): FormGroup {
		return this.createFormGroupByProperties(
			release?.name,
			release?.filePath,
			release?.fileType,
			release?.originalName,
			release?.uid
		);
	}

	public createFormGroupByProperties(
		name: string | undefined,
		filePath: string | undefined,
		fileType: string | undefined,
		originalName: string | undefined,
		uid: string | undefined
	): FormGroup {
		return this.formBuilder.group({
			name: [
				name || null,
				[Validators.required, Validators.min(3), Validators.max(30)],
			],
			originalName: [originalName || null, [Validators.required]],
			filePath: [filePath || null, [Validators.required]],
			fileType: [fileType || null, [Validators.required]],
			uid: [uid || null],
		});
	}

	public updateEntity(formGroup: FormGroup): DocumentEntityUpdate {
		return {
			name: (formGroup.value['name'] as string).trim(),
			filePath: formGroup.value['filePath'],
			originalName: formGroup.value['originalName'],
			fileType: formGroup.value['fileType'],
			uid: formGroup.value['uid'],
		};
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity
	): EntityQuantityEntityUpdate {
		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + 1,
		};
	}

	public convertEntityAddToModelAdd(
		entity: DocumentEntityAdd
	): DocumentModelAdd {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityToModel(entity: DocumentEntity): DocumentModel {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: DocumentEntityUpdate
	): DocumentModelUpdate {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name || ''),
		};
	}

	public convertModelAddToEntityAdd(
		model: DocumentModelAdd
	): DocumentEntityAdd {
		return {
			...model,
		};
	}

	public convertModelToEntity(model: DocumentModel): DocumentEntity {
		return {
			...model,
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: DocumentModelUpdate
	): DocumentEntityUpdate {
		const entity: DocumentEntityUpdate = {
			uid: model.uid,
		};

		if (model.filePath) {
			entity.filePath = model.filePath;
		}

		if (model.fileType) {
			entity.fileType = model.fileType;
		}

		if (model.name) {
			entity.name = model.name;
		}

		if (model.originalName) {
			entity.originalName = model.originalName;
		}

		return entity;
	}
}
