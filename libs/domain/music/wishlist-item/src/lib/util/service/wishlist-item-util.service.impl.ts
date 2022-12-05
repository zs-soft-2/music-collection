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
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate,
	WishlistItemModel,
	WishlistItemModelAdd,
	WishlistItemModelUpdate,
	WishlistItemUtilService,
} from '@music-collection/api';

@Injectable()
export class WishlistItemUtilServiceImpl extends WishlistItemUtilService {
	public _sort = (a: WishlistItemEntity, b: WishlistItemEntity): number =>
		a.albumReference.name < b.albumReference.name ? 1 : -1;

	public constructor(private formBuilder: FormBuilder) {
		super();
	}

	public convertEntityAddToModelAdd(
		entity: WishlistItemEntityAdd
	): WishlistItemModelAdd {
		return {
			...entity,
		};
	}

	public convertEntityToModel(entity: WishlistItemEntity): WishlistItemModel {
		return {
			...entity,
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: WishlistItemEntityUpdate
	): WishlistItemModelUpdate {
		return {
			...entity,
		};
	}

	public convertModelAddToEntityAdd(
		model: WishlistItemModelAdd
	): WishlistItemEntityAdd {
		return {
			...model,
		};
	}

	public convertModelToEntity(model: WishlistItemModel): WishlistItemEntity {
		return {
			...model,
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: WishlistItemModelUpdate
	): WishlistItemEntityUpdate {
		const entity: WishlistItemEntityUpdate = {
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

	public createEntity(formGroup: FormGroup): WishlistItemEntityAdd {
		return {
			entityType: EntityTypeEnum.WishlistItem,
			albumReference: this.createAlbumReference(
				formGroup.value['albumReference']
			),
			artistReference: this.createArtistReference(
				formGroup.value['artistReference']
			),
			userReference: this.createUserReference(
				formGroup.value['userReference']
			),
			formats: formGroup.value['formats'],
			isActive: formGroup.value['isActive'],
			sourceLink: formGroup.value['sourceLink'],
		};
	}

	public createFormGroup(
		wishlistItem: WishlistItemEntity | undefined
	): FormGroup {
		return this.formBuilder.group({
			uid: [wishlistItem?.uid],
			albumReference: [
				wishlistItem?.albumReference || null,
				[Validators.required],
			],
			artistReference: [
				wishlistItem?.artistReference || null,
				[Validators.required],
			],
			userReference: [
				wishlistItem?.userReference || null,
				[Validators.required],
			],
			formats: [wishlistItem?.formats || null, [Validators.required]],
			sourceLink: [wishlistItem?.sourceLink || null],
		});
	}

	public updateEntity(formGroup: FormGroup): WishlistItemEntityUpdate {
		return {
			entityType: EntityTypeEnum.WishlistItem,
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
		wishlistItem: WishlistItemEntity,
		type: UpdateEntityQuantityType
	): EntityQuantityEntityUpdate {
		let group: EntityQuantityGroup = { ...entityQuantity.group };

		const albumGroupItem = group[EntityTypeEnum.Album]
			? { ...(group as any)[EntityTypeEnum.Album] }
			: {};
		const albumProperty =
			albumGroupItem[wishlistItem.albumReference.uid] || 0;
		const value = type === UpdateEntityQuantityTypeEnum.increase ? 1 : -1;

		albumGroupItem[wishlistItem.albumReference.uid] = albumProperty + value;

		group[EntityTypeEnum.Album] = albumGroupItem;

		group = { ...entityQuantity.group };

		const userGroupItem = group[EntityTypeEnum.User]
			? { ...(group as any)[EntityTypeEnum.User] }
			: {};
		const userProperty = userGroupItem[wishlistItem.userReference.uid] || 0;

		userGroupItem[wishlistItem.userReference.uid] = userProperty + value;

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
