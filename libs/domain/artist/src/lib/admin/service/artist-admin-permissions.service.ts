import { Injectable } from '@angular/core';
import {
  ActionEnum,
  ArtistPermissionsService,
  ArtistResourceEnum,
} from '@music-collection/api';

@Injectable()
export class ArtistAdminPermissionsService extends ArtistPermissionsService {
  public static readonly viewArtistAdminPage =
    ActionEnum.VIEW.toString() + ArtistResourceEnum.ROLE_ADMIN_PAGE.toString();
  public static readonly viewArtistEditPage =
    ActionEnum.VIEW.toString() + ArtistResourceEnum.ROLE_EDIT_PAGE.toString();
  public static readonly viewArtistListPage =
    ActionEnum.VIEW.toString() + ArtistResourceEnum.ROLE_LIST_PAGE.toString();
}
