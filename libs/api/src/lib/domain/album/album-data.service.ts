import { FirebaseDataService } from '../../core';
import { AlbumModel, AlbumModelAdd, AlbumModelUpdate } from './album';

export abstract class AlbumDataService extends FirebaseDataService<
	AlbumModel,
	AlbumModelAdd,
	AlbumModelUpdate
> {}
