import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	AlbumEntity,
	AlbumReference,
	ArtistEntity,
	ArtistReference,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityQuantityGroup,
	EntityTypeEnum,
	UpdateEntityQuantityType,
	UpdateEntityQuantityTypeEnum,
	User,
	UserReference,
	WhislistItemEntity,
	WhislistItemEntityAdd,
	WhislistItemEntityUpdate,
	WhislistItemModel,
	WhislistItemModelAdd,
	WhislistItemModelUpdate,
	WhislistItemUtilService,
} from '@music-collection/api';

@Injectable()
export class WhislistItemUtilServiceImpl extends WhislistItemUtilService {
	public _sort = (a: WhislistItemEntity, b: WhislistItemEntity): number =>
		a.albumReference.name < b.albumReference.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public convertEntityAddToModelAdd(
		entity: WhislistItemEntityAdd
	): WhislistItemModelAdd {
		return {
			...entity,
		};
	}

	public convertEntityToModel(entity: WhislistItemEntity): WhislistItemModel {
		return {
			...entity,
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: WhislistItemEntityUpdate
	): WhislistItemModelUpdate {
		return {
			...entity
		};
	}

	public convertModelAddToEntityAdd(
		model: WhislistItemModelAdd
	): WhislistItemEntityAdd {
		return {
			...model,
		};
	}

	public convertModelToEntity(model: WhislistItemModel): WhislistItemEntity {
		return {
			...model,
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: WhislistItemModelUpdate
	): WhislistItemEntityUpdate {
		const entity: WhislistItemEntityUpdate = {
			isActive: model.isActive,
			uid: model.uid,
			entityType: model.entityType,
		};

		if (model.albumReference) {
			entity.albumReference = model.albumReference;
		}

		if (model.formats) {
			entity.formats = model.formats;
		}

		if (model.sourceLink) {
			entity.sourceLink = model.sourceLink;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): WhislistItemEntityAdd {
		return {
			entityType: EntityTypeEnum.WhislistItem,
			albumReference: this.createAlbumReference(formGroup.value['albumReference']),
			artistReference: this.createArtistReference(formGroup.value['artistReference']),
			userReference: this.createUserReference(formGroup.value['userReference']),
			formats: formGroup.value['formats'],
			isActive: formGroup.value['isActive'],
			sourceLink: formGroup.value['sourceLink'],
		};
	}

	public createFormGroup(
		whislistItem: WhislistItemEntity | undefined
	): FormGroup {
		return this.formBuilder.group({
			uid: [whislistItem?.uid],
			albumReference: [whislistItem?.albumReference || null, [Validators.required]],
			artistReference: [whislistItem?.artistReference || null, [Validators.required]],
			userReference: [whislistItem?.userReference || null, [Validators.required]],
			formats: [whislistItem?.formats || null, [Validators.required]],
			sourceLink: [whislistItem?.sourceLink || null],
		});
	}

	public updateEntity(formGroup: FormGroup): WhislistItemEntityUpdate {
		return {
			entityType: EntityTypeEnum.WhislistItem,
			uid: formGroup.value['uid'],
			albumReference: formGroup.value['albumReference'],
			artistReference: formGroup.value['artistReference'],
			userReference: formGroup.value['userReference'],
			formats: formGroup.value['formats'],
			sourceLink: formGroup.value['sourceLink'],
			isActive: formGroup.value['isActive'],
		};
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity,
		whislistItem: WhislistItemEntity,
		type: UpdateEntityQuantityType
	): EntityQuantityEntityUpdate {
		let group: EntityQuantityGroup = { ...entityQuantity.group };

		const albumGroupItem = group[EntityTypeEnum.Album]
			? { ...(group as any)[EntityTypeEnum.Album] }
			: {};
		const albumProperty = albumGroupItem[whislistItem.albumReference.uid] || 0;
		const value = type === UpdateEntityQuantityTypeEnum.increase ? 1 : -1;

		albumGroupItem[whislistItem.albumReference.uid] = albumProperty + value;

		group[EntityTypeEnum.Album] = albumGroupItem;

		group = { ...entityQuantity.group };

		const userGroupItem = group[EntityTypeEnum.User]
			? { ...(group as any)[EntityTypeEnum.User] }
			: {};
		const userProperty = userGroupItem[whislistItem.userReference.uid] || 0;

		userGroupItem[whislistItem.userReference.uid] = userProperty + value;

		group[EntityTypeEnum.User] = userGroupItem;

		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + value,
			group: group as EntityQuantityGroup,
		};
	}

	private createAlbumReference(album: AlbumEntity): AlbumReference {
		const { coverImage, name, uid } = album;

		return {
			coverImage,
			name,
			uid,
		};
	}

	private createArtistReference(artist: ArtistEntity): ArtistReference {
		const { name, uid } = artist;

		return {
			name,
			uid,
		};
	}

	private createUserReference(user: User): UserReference {
		const { displayName, uid } = user;

		return {
			displayName,
			uid,
		};
	}
}
