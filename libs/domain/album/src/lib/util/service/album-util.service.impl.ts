import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	AlbumArtist,
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate,
	AlbumUtilService,
	ArtistEntity,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	GenreEnum,
} from '@music-collection/api';

@Injectable()
export class AlbumUtilServiceImpl extends AlbumUtilService {
	public _sort = (a: AlbumEntity, b: AlbumEntity): number =>
		a.name < b.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public convertEntityAddToModelAdd(entity: AlbumEntityAdd): AlbumModelAdd {
		return {
			...entity,
			year: entity.year?.getTime(),
		};
	}

	public convertEntityToModel(entity: AlbumEntity): AlbumModel {
		return {
			...entity,
			year: entity.year?.getTime(),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: AlbumEntityUpdate
	): AlbumModelUpdate {
		return {
			...entity,
			year: entity.year?.getTime(),
		};
	}

	public convertModelAddToEntityAdd(model: AlbumModelAdd): AlbumEntityAdd {
		return {
			...model,
			year: new Date(model.year),
		};
	}

	public convertModelToEntity(model: AlbumModel): AlbumEntity {
		return {
			...model,
			year: new Date(model.year),
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: AlbumModelUpdate
	): AlbumEntityUpdate {
		const entity: AlbumEntityUpdate = {
			uid: model.uid,
		};

		if (model.year) {
			entity.year = new Date(model.year);
		}

		if (model.artist) {
			entity.artist = model.artist;
		}

		if (model.genre) {
			entity.genre = model.genre;
		}

		if (model.songs) {
			entity.songs = model.songs;
		}

		if (model.name) {
			entity.name = model.name;
		}

		if (model.styles) {
			entity.styles = model.styles;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): AlbumEntityAdd {
		return {
			artist: this.createSimpleArtist(formGroup.value['artist']),
			coverImage: formGroup.value['coverImage'],
			genre: GenreEnum.Rock,
			name: formGroup.value['name'],
			styles: formGroup.value['styles'],
			songs: formGroup.value['songs'],
			year: formGroup.value['year'],
		};
	}

	public createFormGroup(album: AlbumEntity | undefined): FormGroup {
		return this.formBuilder.group({
			artist: [album?.artist || null, [Validators.required]],
			coverImage: [album?.coverImage || null],
			name: [album?.name || null, [Validators.required]],
			songs: [album?.songs || null],
			styles: [album?.styles || null, [Validators.required]],
			uid: [album?.uid],
			year: [album?.year || null, [Validators.required]],
		});
	}

	public updateEntity(formGroup: FormGroup): AlbumEntityUpdate {
		return {
			artist: this.createSimpleArtist(formGroup.value['artist']),
			coverImage: formGroup.value['coverImage'],
			genre: GenreEnum.Rock,
			name: formGroup.value['name'],
			songs: formGroup.value['songs'],
			styles: formGroup.value['styles'],
			uid: formGroup.value['uid'],
			year: formGroup.value['year'],
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

	private createSimpleArtist(artist: ArtistEntity): AlbumArtist {
		const { uid, name } = artist;

		return {
			uid,
			name,
		};
	}
}
