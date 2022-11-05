import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	AlbumEntity,
	ArtistEntity,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityQuantityGroup,
	EntityTypeEnum,
	LabelEntity,
	SimpleAlbum,
	ReleaseArtist,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseLabel,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
	ReleaseUtilService,
} from '@music-collection/api';

@Injectable()
export class ReleaseUtilServiceImpl extends ReleaseUtilService {
	public _sort = (a: ReleaseEntity, b: ReleaseEntity): number =>
		a.name < b.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public convertEntityAddToModelAdd(
		entity: ReleaseEntityAdd
	): ReleaseModelAdd {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityToModel(entity: ReleaseEntity): ReleaseModel {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(entity.name),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: ReleaseEntityUpdate
	): ReleaseModelUpdate {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(entity.name || ''),
		};
	}

	public convertModelAddToEntityAdd(
		model: ReleaseModelAdd
	): ReleaseEntityAdd {
		return {
			...model,
			date: new Date(model.date),
		};
	}

	public convertModelToEntity(model: ReleaseModel): ReleaseEntity {
		return {
			...model,
			date: new Date(model.date),
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: ReleaseModelUpdate
	): ReleaseEntityUpdate {
		const entity: ReleaseEntityUpdate = {
			uid: model.uid,
		};

		if (model.date) {
			entity.date = new Date(model.date);
		}

		if (model.album) {
			entity.album = model.album;
		}

		if (model.artist) {
			entity.artist = model.artist;
		}

		if (model.country) {
			entity.country = model.country;
		}

		if (model.format) {
			entity.format = model.format;
		}

		if (model.formatDescription) {
			entity.formatDescription = model.formatDescription;
		}

		if (model.name) {
			entity.name = model.name;
		}

		if (model.label) {
			entity.label = model.label;
		}

		if (model.media) {
			entity.media = model.media;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): ReleaseEntityAdd {
		return {
			album: this.createReleaseAlbum(formGroup.value['album']),
			artist: this.createReleaseArtist(formGroup.value['artist']),
			country: formGroup.value['country'],
			date: formGroup.value['date'],
			format: formGroup.value['format'],
			formatDescription: formGroup.value['formatDescription'],
			label: this.createReleaseLabel(formGroup.value['label']),
			media: formGroup.value['media'],
			name: formGroup.value['name'],
		};
	}

	public createFormGroup(release: ReleaseEntity | undefined): FormGroup {
		return this.formBuilder.group({
			album: [release?.album || null, [Validators.required]],
			artist: [release?.artist || null, [Validators.required]],
			country: [release?.country || null, [Validators.required]],
			date: [release?.date || null, [Validators.required]],
			format: [release?.format || null, [Validators.required]],
			formatDescription: [release?.formatDescription || null],
			label: [release?.label || null, [Validators.required]],
			media: [release?.media || null, [Validators.required]],
			name: [release?.name || null, [Validators.required]],
			uid: [release?.uid],
		});
	}

	public updateEntity(formGroup: FormGroup): ReleaseEntityUpdate {
		return {
			album: this.createReleaseAlbum(formGroup.value['album']),
			artist: this.createReleaseArtist(formGroup.value['artist']),
			country: formGroup.value['country'],
			date: formGroup.value['date'],
			name: formGroup.value['name'],
			label: this.createReleaseLabel(formGroup.value['label']),
			format: formGroup.value['format'],
			formatDescription: formGroup.value['formatDescription'],
			media: formGroup.value['media'],
			uid: formGroup.value['uid'],
		};
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity,
		release: ReleaseEntity
	): EntityQuantityEntityUpdate {
		let group: EntityQuantityGroup = { ...entityQuantity.group };

		const albumGroupItem = group[EntityTypeEnum.Album]
			? { ...(group as any)[EntityTypeEnum.Album] }
			: {};
		const albumProperty = albumGroupItem[release.album.uid] || 0;

		albumGroupItem[release.album.uid] = albumProperty + 1;

		group[EntityTypeEnum.Album] = albumGroupItem;

		group = { ...entityQuantity.group };

		const artistGroupItem = group[EntityTypeEnum.Artist]
			? { ...(group as any)[EntityTypeEnum.Artist] }
			: {};
		const artistProperty = artistGroupItem[release.artist.uid] || 0;

		artistGroupItem[release.artist.uid] = artistProperty + 1;

		group[EntityTypeEnum.Album] = albumGroupItem;

		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + 1,
			group: group as EntityQuantityGroup,
		};
	}

	private createReleaseAlbum(album: AlbumEntity): SimpleAlbum {
		const { uid, name, artist, coverImage, genre, songs, styles } = album;

		return {
			uid,
			name,
			artist,
			coverImage,
			genre,
			songs,
			styles,
		};
	}

	private createReleaseArtist(artist: ArtistEntity): ReleaseArtist {
		const { uid, name } = artist;

		return {
			uid,
			name,
		};
	}

	private createReleaseLabel(label: LabelEntity): ReleaseLabel {
		const { uid, name } = label;

		return {
			uid,
			name,
		};
	}
}
