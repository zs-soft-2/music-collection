import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
	ArtistUtilService,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityTypeEnum,
	GenreEnum,
	ParamItem,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class ArtistUtilServiceImpl extends ArtistUtilService {
	public _sort = (a: ArtistEntity, b: ArtistEntity): number =>
		a.name < b.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public convertEntityAddToModelAdd(entity: ArtistEntityAdd): ArtistModelAdd {
		return {
			...entity,
			formedIn: entity.formedIn?.getTime(),
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityToModel(entity: ArtistEntity): ArtistModel {
		return {
			...entity,
			formedIn: entity.formedIn?.getTime(),
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: ArtistEntityUpdate
	): ArtistModelUpdate {
		return {
			...entity,
			formedIn: entity.formedIn?.getTime(),
			searchParameters: this.createSearchParameters(entity.name || ''),
		};
	}

	public convertModelAddToEntityAdd(model: ArtistModelAdd): ArtistEntityAdd {
		return {
			...model,
			formedIn: new Date(model.formedIn),
		};
	}

	public convertModelToEntity(model: ArtistModel): ArtistEntity {
		return {
			...model,
			formedIn: new Date(model.formedIn),
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: ArtistModelUpdate
	): ArtistEntityUpdate {
		const entity: ArtistEntityUpdate = {
			uid: model.uid,
		};

		if (model.formedIn) {
			entity.formedIn = new Date(model.formedIn);
		}

		if (model.description) {
			entity.description = model.description;
		}

		if (model.headerImage) {
			entity.headerImage = model.headerImage;
		}

		if (model.mainImage) {
			entity.mainImage = model.mainImage;
		}

		if (model.genre) {
			entity.genre = model.genre;
		}

		if (model.members) {
			entity.members = model.members;
		}

		if (model.name) {
			entity.name = model.name;
		}

		if (model.sites) {
			entity.sites = model.sites;
		}

		if (model.styles) {
			entity.styles = model.styles;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): ArtistEntityAdd {
		return {
			description: formGroup.value['description'],
			formedIn: formGroup.value['formedIn'],
			genre: GenreEnum.Rock,
			headerImage: formGroup.value['headerImage'],
			mainImage: formGroup.value['mainImage'],
			name: (formGroup.value['name'] as string).trim(),
			sites: [],
			styles: formGroup.value['styles'],
		};
	}

	public createFormGroup(artist: ArtistEntity | undefined): FormGroup {
		return this.formBuilder.group({
			description: [artist?.description || null],
			formedIn: [artist?.formedIn || null, [Validators.required]],
			headerImage: [artist?.headerImage || null],
			mainImage: [artist?.mainImage || null],
			name: [
				artist?.name || null,
				[Validators.required, Validators.min(3), Validators.max(30)],
			],
			styles: [artist?.styles || null, [Validators.required]],
			uid: [artist?.uid],
		});
	}

	public createSearchParams(
		entityType: EntityTypeEnum,
		term: string
	): SearchParams {
		const query: ParamItem<string> = {
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.arrayContains,
			field: 'searchParameters',
			value: term.toLowerCase(),
		};

		const searchParams: SearchParams = [{ entityType, query }];

		return searchParams;
	}

	public updateEntity(formGroup: FormGroup): ArtistEntityUpdate {
		return {
			description: formGroup.value['description'],
			formedIn: formGroup.value['formedIn'],
			genre: GenreEnum.Rock,
			headerImage: formGroup.value['headerImage'],
			mainImage: formGroup.value['mainImage'],
			name: (formGroup.value['name'] as string).trim(),
			styles: formGroup.value['styles'],
			sites: [],
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
