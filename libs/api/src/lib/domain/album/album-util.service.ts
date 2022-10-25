import { EntityUtilService } from '../../common';
import { AlbumEntity, AlbumEntityAdd, AlbumEntityUpdate } from './album';

export abstract class AlbumUtilService extends EntityUtilService<
  AlbumEntity,
  AlbumEntityAdd,
  AlbumEntityUpdate
> {}
