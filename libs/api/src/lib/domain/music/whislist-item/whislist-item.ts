import { FormGroup } from '@angular/forms';

import { Activable, Entity, FormatEnum } from '../../../common';
import { UserReference } from '../../../core';
import { AlbumEntity, AlbumReference } from '../album';
import { ArtistReference } from '../artist';

export interface WhislistItem {
	albumReference: AlbumReference;
	artistReference: ArtistReference;
	formats: FormatEnum[];
	sourceLink: string;
	userReference: UserReference;
}

export type WhislistItemEntity = WhislistItem & Activable & Entity;

export type WhislistItemEntityAdd = Omit<WhislistItemEntity, 'uid'>;

export type WhislistItemEntityUpdate = Partial<WhislistItemEntity> &
	Entity &
	Activable;

export type WhislistItemModel = WhislistItem & Entity & Activable;

export type WhislistItemModelAdd = Omit<WhislistItemModel, 'uid'>;

export type WhislistItemModelUpdate = Partial<WhislistItemModel> &
	Entity &
	Activable;

export type WhislistItemFormParams = {
	albums: AlbumEntity[];
	formGroup: FormGroup;
	formatList: FormatEnum[];
};

export type WhislistItemTableParams = {
	whislistItems: WhislistItemEntity[];
	empty: string[];
};

export type WhislistItemListParams = {
	whislistItems: WhislistItemEntity[];
};
