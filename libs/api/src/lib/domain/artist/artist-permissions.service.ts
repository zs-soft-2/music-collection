import { ActionEnum } from '../../core';
import { ArtistResourceEnum } from './artist-resource.enum';

export class ArtistPermissionsService {
  static readonly createArtistEntity =
    ActionEnum.CREATE.toString() + ArtistResourceEnum.ROLE_ENTITY.toString();
  static readonly deleteArtistEntity =
    ActionEnum.DELETE.toString() + ArtistResourceEnum.ROLE_ENTITY.toString();
  static readonly updateArtistEntity =
    ActionEnum.UPDATE.toString() + ArtistResourceEnum.ROLE_ENTITY.toString();
  static readonly viewArtistEntity =
    ActionEnum.VIEW.toString() + ArtistResourceEnum.ROLE_ENTITY.toString();
}
