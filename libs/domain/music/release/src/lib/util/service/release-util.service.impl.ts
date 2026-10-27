import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	AlbumEntity,
	ArtistEntity,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityQuantityGroup,
	EntityTypeEnum,
	LabelEntity,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	ReleaseArtist,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseLabel,
	ReleaseModel,
	ReleaseModelAdd,
	ReleaseModelUpdate,
	ReleaseUtilService,
	SearchParams,
	SimpleAlbum,
	UpdateEntityQuantityType,
	UpdateEntityQuantityTypeEnum,
	toCoverColor,
} from '@music-collection/api';

@Injectable()
export class ReleaseUtilServiceImpl extends ReleaseUtilService {
	private formBuilder = inject(FormBuilder);

	public _sort = (a: ReleaseEntity, b: ReleaseEntity): number =>
		a.name < b.name ? 1 : -1;

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
			entityType: model.entityType,
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

		// Cleared by hand, these are null rather than missing, and the store
		// has to hear that too: a `catno` removed from the form must not
		// leave the old number standing in the list behind it.
		if (model.catno !== undefined) {
			entity.catno = model.catno;
		}

		if (model.country) {
			entity.country = model.country;
		}

		// Like `catno`: a colour the admin took off the pressing is null and
		// not missing, and the store has to hear that too — otherwise the
		// shelf keeps drawing the spine in a colour nobody chose any more.
		if (model.coverColor !== undefined) {
			entity.coverColor = model.coverColor;
		}

		if (model.discogsReleaseId !== undefined) {
			entity.discogsReleaseId = model.discogsReleaseId;
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

		if (model.updatedAt) {
			entity.updatedAt = model.updatedAt;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): ReleaseEntityAdd {
		return {
			album: formGroup.value['album'],
			artist: this.createReleaseArtist(formGroup.value['artist']),
			catno: formGroup.value['catno'] || null,
			country: formGroup.value['country'],
			coverColor: toCoverColor(formGroup.value['coverColor']),
			date: formGroup.value['date'],
			discogsReleaseId: formGroup.value['discogsReleaseId'] ?? null,
			entityType: EntityTypeEnum.Release,
			formatDescription: formGroup.value['formatDescription'],
			label: this.createReleaseLabel(formGroup.value['label']),
			media: formGroup.value['media'],
			name: formGroup.value['name'],
		};
	}

	public createFormGroup(entity: ReleaseEntity | undefined): FormGroup<any> {
		throw new Error('Method not implemented.');
	}

	public createOrUpdateFormGroupForDisabling(
		formGroup: FormGroup,
		release: ReleaseEntity | undefined,
		isAlbumsActive: boolean,
		isArtistsActive: boolean
	): FormGroup {
		let newFormGroup: FormGroup;

		if (!formGroup) {
			newFormGroup = this.formBuilder.group({
				album: [release?.album || null, [Validators.required]],
				artist: [release?.artist || null, [Validators.required]],
				// The number the label printed on this pressing. Typed in by
				// hand or loaded from Discogs; it is what a photographed
				// spine is matched against, so it is worth having on a
				// pressing an admin enters.
				catno: [release?.catno || null],
				country: [release?.country || null, [Validators.required]],
				// What this pressing's sleeve looks like, for the shelf to
				// draw the spine in. Optional: most of the catalog was
				// seeded from elsewhere and nobody has had the record in
				// their hands to say.
				coverColor: [toCoverColor(release?.coverColor)],
				date: [release?.date || null, [Validators.required]],
				// The Discogs pressing a load came from. No field of its own
				// on the form: it is set by the load and carried on.
				discogsReleaseId: [release?.discogsReleaseId ?? null],
				formatDescription: [release?.formatDescription || null],
				// A generic release has none: it is the album on a medium,
				// not a pressing of it.
				label: [release?.label || null],
				media: [release?.media || null, [Validators.required]],
				name: [release?.name || null, [Validators.required]],
				uid: [release?.uid],
			});
		} else {
			if (isAlbumsActive) {
				formGroup.get('album')?.enable();
			}

			if (isArtistsActive) {
				formGroup.get('artist')?.enable();
			}

			newFormGroup = formGroup;
		}

		return newFormGroup;
	}

	public createSearchParamsForAlbum(
		term: string,
		artistId: string
	): SearchParams {
		const searchParams: SearchParams = [
			this.createSearchParam(
				EntityTypeEnum.Album,
				term.toLowerCase(),
				QueryConstraintTypeEnum.where,
				QueryOperatorEnum.arrayContains,
				'searchParameters'
			),
			this.createSearchParam(
				EntityTypeEnum.Album,
				artistId,
				QueryConstraintTypeEnum.where,
				QueryOperatorEnum.equal,
				'artist.uid'
			),
		];

		return searchParams;
	}

	public updateEntity(formGroup: FormGroup): ReleaseEntityUpdate {
		return {
			album: formGroup.value['album'],
			artist: this.createReleaseArtist(formGroup.value['artist']),
			catno: formGroup.value['catno'] || null,
			country: formGroup.value['country'],
			coverColor: toCoverColor(formGroup.value['coverColor']),
			date: formGroup.value['date'],
			discogsReleaseId: formGroup.value['discogsReleaseId'] ?? null,
			entityType: EntityTypeEnum.Release,
			name: formGroup.value['name'],
			label: this.createReleaseLabel(formGroup.value['label']),
			formatDescription: formGroup.value['formatDescription'],
			media: formGroup.value['media'],
			uid: formGroup.value['uid'],
		};
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity,
		release: ReleaseEntity,
		type: UpdateEntityQuantityType
	): EntityQuantityEntityUpdate {
		let group: EntityQuantityGroup = { ...entityQuantity.group };

		const albumGroupItem = group[EntityTypeEnum.Album]
			? { ...(group as any)[EntityTypeEnum.Album] }
			: {};
		const albumProperty = albumGroupItem[release.album.uid] || 0;
		const value = type === UpdateEntityQuantityTypeEnum.increase ? 1 : -1;

		albumGroupItem[release.album.uid] = albumProperty + value;

		group[EntityTypeEnum.Album] = albumGroupItem;

		group = { ...entityQuantity.group };

		const artistGroupItem = group[EntityTypeEnum.Artist]
			? { ...(group as any)[EntityTypeEnum.Artist] }
			: {};
		const artistProperty = artistGroupItem[release.artist.uid] || 0;

		artistGroupItem[release.artist.uid] = artistProperty + value;

		group[EntityTypeEnum.Artist] = artistGroupItem;

		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + value,
			group: group as EntityQuantityGroup,
		};
	}

	private createReleaseAlbum(album: AlbumEntity): SimpleAlbum {
		const {
			uid,
			name,
			artist,
			coverImage,
			coverImageUrl,
			entityType,
			format,
			genre,
			songs,
			styles,
		} = album;

		return {
			uid,
			name,
			artist,
			coverImage,
			coverImageUrl,
			entityType,
			format,
			genre,
			songs,
			styles,
		};
	}

	private createReleaseArtist(artist: ArtistEntity): ReleaseArtist {
		const { entityType, uid, name } = artist;

		return {
			entityType,
			uid,
			name,
		};
	}

	private createReleaseLabel(label: LabelEntity | null): ReleaseLabel | null {
		if (!label) {
			return null;
		}

		const { entityType, uid, name } = label;

		return {
			entityType,
			uid,
			name,
		};
	}
}
