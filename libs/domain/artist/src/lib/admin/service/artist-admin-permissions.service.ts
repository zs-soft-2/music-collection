import { Injectable } from '@angular/core';
import {
  ActionEnum,
  ArtistPermissionsService,
  ArtistResourceEnum,
} from '@music-collection/api';

@Injectable()
export class ArtistAdminPermissionsService extends ArtistPermissionsService {
  public static readonly viewArtistAdminPage =
    ActionEnum.VIEW.toString() +
    ArtistResourceEnum.ARTIST_ADMIN_PAGE.toString();
  public static readonly viewArtistEditPage =
    ActionEnum.VIEW.toString() + ArtistResourceEnum.ARTIST_EDIT_PAGE.toString();
  public static readonly viewArtistListPage =
    ActionEnum.VIEW.toString() + ArtistResourceEnum.ARTIST_LIST_PAGE.toString();
}
