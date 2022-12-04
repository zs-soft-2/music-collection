import { FirebaseDataService } from '../../../core';
import {
	WhislistItemModel,
	WhislistItemModelAdd,
	WhislistItemModelUpdate,
} from './whislist-item';

export abstract class WhislistItemDataService extends FirebaseDataService<
	WhislistItemModel,
	WhislistItemModelAdd,
	WhislistItemModelUpdate
> {}
