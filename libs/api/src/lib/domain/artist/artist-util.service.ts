import { EntityUtilService } from '../../common';
import { ArtistEntity, ArtistEntityAdd, ArtistEntityUpdate } from './artist';

export abstract class ArtistUtilService extends EntityUtilService<
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate
> {}
