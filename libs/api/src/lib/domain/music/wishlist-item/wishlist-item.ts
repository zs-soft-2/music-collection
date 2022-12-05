import { FormGroup } from '@angular/forms';

import { Activable, Entity, FormatEnum } from '../../../common';
import { UserReference } from '../../../core';
import { AlbumEntity, AlbumReference } from '../album';
import { ArtistReference } from '../artist';

export interface WishlistItem {
	albumReference: AlbumReference;
	artistReference: ArtistReference;
	formats: FormatEnum[];
	sourceLink: string;
	userReference: UserReference;
}

export type WishlistItemEntity = WishlistItem & Activable & Entity;

export type WishlistItemEntityAdd = Omit<WishlistItemEntity, 'uid'>;

export type WishlistItemEntityUpdate = Partial<WishlistItemEntity> &
	Entity &
	Activable;

export type WishlistItemModel = WishlistItem & Entity & Activable;

export type WishlistItemModelAdd = Omit<WishlistItemModel, 'uid'>;

export type WishlistItemModelUpdate = Partial<WishlistItemModel> &
	Entity &
	Activable;

export type WishlistItemFormParams = {
	albums: AlbumEntity[];
	formGroup: FormGroup;
	formatList: FormatEnum[];
};

export type WishlistItemTableParams = {
	wishlistItems: WishlistItemEntity[];
	empty: string[];
};

export type WishlistItemListParams = {
	wishlistItems: WishlistItemEntity[];
};
