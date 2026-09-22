import objectHash from 'object-hash';

import { Injectable, inject } from '@angular/core';
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
	EntityTypeEnum,
} from '@music-collection/api';

@Injectable()
export class DocumentUtilServiceImpl extends DocumentUtilService {
	private formBuilder = inject(FormBuilder);

	public _sort(a: DocumentEntity, b: DocumentEntity): number {
		return a.name < b.name ? 1 : -1;
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
			entityType: model.entityType,
			uid: model.uid,
		};

		if (model.category) {
			entity.category = model.category;
		}

		if (model.deletedAt !== undefined) {
			entity.deletedAt = model.deletedAt;
		}

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

		if (model.updatedAt) {
			entity.updatedAt = model.updatedAt;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): DocumentEntityAdd {
		return {
			entityType: EntityTypeEnum.Document,
			name: (formGroup.value['name'] as string).trim(),
			filePath: formGroup.value['filePath'],
			originalName: formGroup.value['originalName'],
			fileType: formGroup.value['fileType'],
			...this.filedProperties(formGroup),
		};
	}

	public createFilePath(data: string, folder = '/'): string {
		return folder + objectHash(data);
	}

	public createFormGroup(document: DocumentEntity | undefined): FormGroup {
		return this.createFormGroupByProperties({ ...document });
	}

	public createFormGroupByProperties(
		document: Partial<DocumentEntity>
	): FormGroup {
		return this.formBuilder.group({
			name: [
				document.name || null,
				[Validators.required, Validators.min(3), Validators.max(30)],
			],
			originalName: [
				document.originalName || null,
				[Validators.required],
			],
			filePath: [document.filePath || null, [Validators.required]],
			fileType: [document.fileType || null, [Validators.required]],
			// Carried, not edited: a save writes the whole document.
			category: [document.category || null],
			deletedAt: [document.deletedAt ?? null],
			uid: [document.uid || null],
		});
	}

	public updateEntity(formGroup: FormGroup): DocumentEntityUpdate {
		return {
			entityType: EntityTypeEnum.Document,
			name: (formGroup.value['name'] as string).trim(),
			filePath: formGroup.value['filePath'],
			originalName: formGroup.value['originalName'],
			fileType: formGroup.value['fileType'],
			uid: formGroup.value['uid'],
			...this.filedProperties(formGroup),
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

	/**
	 * What the form carries but nobody edits. Left out while empty: an
	 * undefined field is not something Firestore takes.
	 */
	private filedProperties(
		formGroup: FormGroup
	): Pick<DocumentEntity, 'category' | 'deletedAt'> {
		const category = formGroup.value['category'];
		const deletedAt = formGroup.value['deletedAt'];

		return {
			...(category ? { category } : {}),
			...(deletedAt ? { deletedAt } : {}),
		};
	}
}
