import * as objectHash from 'object-hash';

import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
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
			name: formGroup.value['name'],
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
			name: formGroup.value['name'],
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
}
