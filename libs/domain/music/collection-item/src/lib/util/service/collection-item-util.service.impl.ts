import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemModel,
	CollectionItemModelAdd,
	CollectionItemModelUpdate,
	CollectionItemUtilService,
	CollectionSortByEnum,
	EntityQuantityEntity,
	EntityQuantityEntityUpdate,
	EntityQuantityGroup,
	EntityTypeEnum,
	ParamItem,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	SearchParams,
	UpdateEntityQuantityType,
	UpdateEntityQuantityTypeEnum,
	User,
} from '@music-collection/api';

@Injectable()
export class CollectionItemUtilServiceImpl extends CollectionItemUtilService {
	private formBuilder = inject(FormBuilder);

	public _sort = (a: CollectionItemEntity, b: CollectionItemEntity): number =>
		a.release.name <= b.release.name ? -1 : 1;
	public _sortByArtistName = (
		a: CollectionItemEntity,
		b: CollectionItemEntity
	): number => (a.release.artist.name <= b.release.artist.name ? -1 : 1);

	public convertEntityAddToModelAdd(
		entity: CollectionItemEntityAdd
	): CollectionItemModelAdd {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(
				entity.release.name || ''
			),
			artistSearchParameters: this.createSearchParameters(
				entity.release.artist?.name || ''
			),
		};
	}

	public convertEntityToModel(
		entity: CollectionItemEntity
	): CollectionItemModel {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(
				entity.release.name || ''
			),
			artistSearchParameters: this.createSearchParameters(
				entity.release.artist?.name || ''
			),
		};
	}

	public convertEntityUpdateToModelUpdate(
		entity: CollectionItemEntityUpdate
	): CollectionItemModelUpdate {
		return {
			...entity,
			date: entity.date?.getTime(),
			searchParameters: this.createSearchParameters(
				entity.release?.name || ''
			),
			artistSearchParameters: this.createSearchParameters(
				entity.release?.artist?.name || ''
			),
		};
	}

	public convertModelAddToEntityAdd(
		model: CollectionItemModelAdd
	): CollectionItemEntityAdd {
		return {
			...model,
			date: new Date(model.date),
		};
	}

	public convertModelToEntity(
		model: CollectionItemModel
	): CollectionItemEntity {
		return {
			...model,
			date: new Date(model.date),
		};
	}

	public convertModelUpdateToEntityUpdate(
		model: CollectionItemModelUpdate
	): CollectionItemEntityUpdate {
		const entity: CollectionItemEntityUpdate = {
			uid: model.uid,
			entityType: model.entityType,
		};

		if (model.date) {
			entity.date = new Date(model.date);
		}

		if (model.description) {
			entity.description = model.description;
		}

		if (model.release) {
			entity.release = model.release;
		}

		if (model.userId) {
			entity.userId = model.userId;
		}

		if (model.updatedAt) {
			entity.updatedAt = model.updatedAt;
		}

		// A place taken back is written as `null`, which is a change like any
		// other — only a missing key means the place was left alone.
		if (model.placement !== undefined) {
			entity.placement = model.placement;
		}

		return entity;
	}

	public createEntity(formGroup: FormGroup): CollectionItemEntityAdd {
		return {
			release: formGroup.value['release'],
			userId: formGroup.value['userId'],
			description: formGroup.value['description'],
			date: formGroup.value['date'],
			placement: formGroup.value['placement'] ?? null,
			entityType: EntityTypeEnum.CollectionItem,
		};
	}

	public createFormGroup(collectionItem: CollectionItemEntity): FormGroup {
		throw new Error('Called an unimplemented method!');
	}

	public createFormGroupByUser(
		collectionItem: CollectionItemEntity,
		authenticatedUser: User
	): FormGroup {
		return this.formBuilder.group({
			uid: [collectionItem?.uid],
			userId: [collectionItem?.userId || authenticatedUser?.uid],
			date: [collectionItem?.date || null, [Validators.required]],
			release: [collectionItem?.release || null, [Validators.required]],
			description: [collectionItem?.description || null],
			// Where the copy stands on the shelf; the form writes the whole
			// placement at once, so it is one value rather than three fields.
			placement: [collectionItem?.placement ?? null],
		});
	}

	/**
	 * The search of the artist column: it looks in the prefixes of the
	 * artist's name written next to the item, not in the release's own.
	 */
	public createSearchParamsByArtist(
		entityType: EntityTypeEnum,
		term: string
	): SearchParams {
		const query: ParamItem<string> = {
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.arrayContains,
			field: 'artistSearchParameters',
			value: term.toLowerCase(),
		};

		return [{ entityType, query }];
	}

	public filterByArtist(
		collectionItems: CollectionItemEntity[],
		filterByArtistNames: string[] | null
	): CollectionItemEntity[] {
		return filterByArtistNames
			? collectionItems.filter((item) =>
					filterByArtistNames.includes(item.release.artist.name)
			  )
			: collectionItems;
	}

	public sortCollectionItems(
		sortBy: CollectionSortByEnum | null,
		collectionItems: CollectionItemEntity[]
	): CollectionItemEntity[] {
		let sortedCollectionItems: CollectionItemEntity[];

		switch (sortBy) {
			case CollectionSortByEnum.random:
				sortedCollectionItems = this.shuffleArray(collectionItems);

				break;
			case CollectionSortByEnum.ascAlbumName:
				sortedCollectionItems = collectionItems.sort(this._sort);

				break;
			case CollectionSortByEnum.descAlbumName:
				sortedCollectionItems = collectionItems
					.sort(this._sort)
					.reverse();

				break;
			case CollectionSortByEnum.ascArtistName:
				sortedCollectionItems = collectionItems.sort(
					this._sortByArtistName
				);

				break;
			case CollectionSortByEnum.descArtistName:
				sortedCollectionItems = collectionItems
					.sort(this._sortByArtistName)
					.reverse();

				break;
			default:
				sortedCollectionItems = collectionItems;

				break;
		}

		return sortedCollectionItems;
	}

	public updateEntity(formGroup: FormGroup): CollectionItemEntityUpdate {
		return {
			uid: formGroup.value['uid'],
			release: formGroup.value['release'],
			userId: formGroup.value['userId'],
			description: formGroup.value['description'],
			date: formGroup.value['date'],
			placement: formGroup.value['placement'] ?? null,
			entityType: EntityTypeEnum.CollectionItem,
		};
	}

	public updateEntityQuantity(
		entityQuantity: EntityQuantityEntity,
		collectionItem: CollectionItemEntity,
		type: UpdateEntityQuantityType
	): EntityQuantityEntityUpdate {
		const group: object = { ...entityQuantity.group };
		const userGroup = (group as any)[EntityTypeEnum.User]
			? { ...(group as any)[EntityTypeEnum.User] }
			: {};
		const userProperty = userGroup[collectionItem.userId || ''] || 0;
		const value = type === UpdateEntityQuantityTypeEnum.increase ? 1 : -1;

		userGroup[collectionItem.userId || ''] = userProperty + value;

		(group as any)[EntityTypeEnum.User] = userGroup;

		return {
			...entityQuantity,
			quantity: entityQuantity.quantity + value,
			group: group as EntityQuantityGroup,
		};
	}

	private shuffleArray(
		array: CollectionItemEntity[]
	): CollectionItemEntity[] {
		let size = array.length,
			t,
			i;

		while (size) {
			i = Math.floor(Math.random() * size--);
			t = array[size];

			array[size] = array[i];
			array[i] = t;
		}

		return array;
	}
}
