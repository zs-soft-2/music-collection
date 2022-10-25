import { ActionEnum } from '../../core';
import { ArtistResourceEnum } from './artist-resource.enum';

export class ArtistPermissionsService {
  static readonly createArtistEntity =
    ActionEnum.CREATE.toString() + ArtistResourceEnum.ARTIST_ENTITY.toString();
  static readonly deleteArtistEntity =
    ActionEnum.DELETE.toString() + ArtistResourceEnum.ARTIST_ENTITY.toString();
  static readonly updateArtistEntity =
    ActionEnum.UPDATE.toString() + ArtistResourceEnum.ARTIST_ENTITY.toString();
  static readonly viewArtistEntity =
    ActionEnum.VIEW.toString() + ArtistResourceEnum.ARTIST_ENTITY.toString();
}
