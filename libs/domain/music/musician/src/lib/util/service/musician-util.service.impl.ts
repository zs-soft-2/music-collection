import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityTypeEnum,
	MusicianEntity,
	MusicianEntityAdd,
	MusicianEntityUpdate,
	MusicianModel,
	MusicianModelAdd,
	MusicianModelUpdate,
	MusicianUtilService,
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
export class MusicianUtilServiceImpl extends MusicianUtilService {
	private formBuilder = inject(FormBuilder);

	public _sort = (a: MusicianEntity, b: MusicianEntity): number =>
		a.name < b.name ? 1 : -1;

	public createEntity(formGroup: FormGroup): MusicianEntityAdd {
		return {
			entityType: EntityTypeEnum.Musician,
			...this.formValues(formGroup),
		};
	}

	/**
	 * The whole document: an update replaces it, so the fields the form does
	 * not edit (Discogs id, source, name variations) are carried along.
	 */
	public updateEntity(formGroup: FormGroup): MusicianEntityUpdate {
		return {
			entityType: EntityTypeEnum.Musician,
			uid: formGroup.value['uid'],
			...this.formValues(formGroup),
		};
	}

	public createFormGroup(musician: MusicianEntity | undefined): FormGroup {
		return this.formBuilder.group({
			uid: [musician?.uid],
			name: [musician?.name || null, [Validators.required]],
			realName: [musician?.realName || null],
			description: [musician?.description || null],
			imageUrl: [
				musician?.imageUrl || null,
				[Validators.pattern(/^https?:\/\/\S+$/i)],
			],
			sites: [(musician?.sites ?? []).join('\n')],
			aliases: [(musician?.aliases ?? []).join('\n')],
			discogsId: [musician?.discogsId ?? null, [Validators.min(1)]],
			nameVariations: [musician?.nameVariations ?? []],
			source: [musician?.source ?? null],
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

	public convertEntityAddToModelAdd(
		entity: MusicianEntityAdd
	): MusicianModelAdd {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityToModel(entity: MusicianEntity): MusicianModel {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: MusicianEntityUpdate
	): MusicianModelUpdate {
		return {
			...entity,
			searchParameters: this.createSearchParameters(entity.name || ''),
		};
	}

	public convertModelAddToEntityAdd(
		model: MusicianModelAdd
	): MusicianEntityAdd {
		return {
			...model,
		};
	}

	public convertModelToEntity(model: MusicianModel): MusicianEntity {
		return {
			...model,
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: MusicianModelUpdate
	): MusicianEntityUpdate {
		const entity: MusicianEntityUpdate & { searchParameters?: string[] } = {
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
			realName: orNull(value['realName']),
			description: orNull(value['description']),
			imageUrl: orNull(value['imageUrl']),
			sites: toLines(value['sites']),
			aliases: toLines(value['aliases']),
			discogsId: discogsId > 0 ? discogsId : null,
			nameVariations: value['nameVariations'] ?? [],
			source: value['source'] ?? 'manual',
		};
	}
}
