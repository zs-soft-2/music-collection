import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	AlbumEntityAdd,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistExternalAlbum,
	ArtistModel,
	ArtistModelAdd,
	ArtistModelUpdate,
	ArtistUtilService,
	DEFAULT_ARTIST_TYPE,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityTypeEnum,
	GenreEnum,
} from '@music-collection/api';

@Injectable()
export class ArtistUtilServiceImpl extends ArtistUtilService {
	private formBuilder = inject(FormBuilder);

	public _sort = (a: ArtistEntity, b: ArtistEntity): number =>
		a.name < b.name ? 1 : -1;

	public convertEntityAddToModelAdd(entity: ArtistEntityAdd): ArtistModelAdd {
		return {
			...entity,
			formedIn: entity.formedIn?.toISOString() ?? null,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityToModel(entity: ArtistEntity): ArtistModel {
		return {
			...entity,
			formedIn: entity.formedIn?.toISOString() ?? null,
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: ArtistEntityUpdate
	): ArtistModelUpdate {
		return {
			...entity,
			formedIn: entity.formedIn?.toISOString(),
			searchParameters: this.createSearchParameters(entity.name || ''),
		};
	}

	public convertModelAddToEntityAdd(model: ArtistModelAdd): ArtistEntityAdd {
		return {
			...model,
			formedIn: model.formedIn ? new Date(model.formedIn) : null,
		};
	}

	public convertModelToEntity(model: ArtistModel): ArtistEntity {
		return {
			...model,
			formedIn: model.formedIn ? new Date(model.formedIn) : null,
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: ArtistModelUpdate
	): ArtistEntityUpdate {
		const entity: ArtistEntityUpdate = {
			uid: model.uid,
			entityType: model.entityType,
		};

		if (model.artistType) {
			entity.artistType = model.artistType;
		}

		if (model.country) {
			entity.country = model.country;
		}

		if (model.formedIn) {
			entity.formedIn = new Date(model.formedIn);
		}

		if (model.description) {
			entity.description = model.description;
		}

		if (model.headerImage) {
			entity.headerImage = model.headerImage;
		}

		if (model.imageUrl !== undefined) {
			entity.imageUrl = model.imageUrl;
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

		if (model.updatedAt) {
			entity.updatedAt = model.updatedAt;
		}

		return entity;
	}

	public createAlbumFromExternal(
		artist: ArtistEntity,
		album: ArtistExternalAlbum
	): AlbumEntityAdd {
		return {
			artist: {
				entityType: EntityTypeEnum.Artist,
				name: artist.name,
				searchParameters: this.createSearchParameters(artist.name),
				uid: artist.uid,
			},
			coverImage: null,
			entityType: EntityTypeEnum.Album,
			format: album.format,
			genre: GenreEnum.Rock,
			name: album.name.trim(),
			songs: [],
			styles: artist.styles ?? [],
			year: album.year ?? new Date(0),
		};
	}

	public createEntity(formGroup: FormGroup): ArtistEntityAdd {
		return {
			artistType: formGroup.value['artistType'] ?? DEFAULT_ARTIST_TYPE,
			country: formGroup.value['country'],
			description: formGroup.value['description'],
			entityType: EntityTypeEnum.Artist,
			formedIn: formGroup.value['formedIn'],
			genre: GenreEnum.Rock,
			headerImage: formGroup.value['headerImage'],
			imageUrl: formGroup.value['imageUrl'] || null,
			mainImage: formGroup.value['mainImage'],
			name: (formGroup.value['name'] as string).trim(),
			sites: [],
			styles: formGroup.value['styles'],
		};
	}

	public createFormGroup(artist: ArtistEntity | undefined): FormGroup {
		return this.formBuilder.group({
			artistType: [
				artist?.artistType ?? DEFAULT_ARTIST_TYPE,
				[Validators.required],
			],
			country: [artist?.country || null],
			description: [artist?.description || null],
			formedIn: [artist?.formedIn || null, [Validators.required]],
			headerImage: [artist?.headerImage || null],
			imageUrl: [artist?.imageUrl || null],
			mainImage: [artist?.mainImage || null],
			name: [
				artist?.name || null,
				[Validators.required, Validators.min(3), Validators.max(30)],
			],
			styles: [artist?.styles || null, [Validators.required]],
			uid: [artist?.uid],
		});
	}

	public updateEntity(formGroup: FormGroup): ArtistEntityUpdate {
		return {
			artistType: formGroup.value['artistType'] ?? DEFAULT_ARTIST_TYPE,
			country: formGroup.value['country'],
			description: formGroup.value['description'],
			entityType: EntityTypeEnum.Artist,
			formedIn: formGroup.value['formedIn'],
			genre: GenreEnum.Rock,
			headerImage: formGroup.value['headerImage'],
			imageUrl: formGroup.value['imageUrl'] || null,
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
