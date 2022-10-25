import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlbumStateService,
  BaseComponent,
  RoleNames,
} from '@music-collection/api';

import { AlbumAdminPermissionsService } from '../../service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-album-admin',
  templateUrl: './album-admin.component.html',
  styleUrls: ['./album-admin.component.scss'],
})
export class AlbumAdminComponent extends BaseComponent implements OnInit {
  public buttonPermissions: string[] = [];
  public isNewEntityButtonEnabled$!: Observable<boolean>;

  public constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private albumStateService: AlbumStateService
  ) {
    super();
  }

  public clickHandler(): void {
    this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
  }

  public ngOnInit(): void {
    this.isNewEntityButtonEnabled$ =
      this.albumStateService.selectNewEntityButtonEnabled$();

    this.initButtonPermissions();
  }

  private initButtonPermissions(): void {
    this.buttonPermissions = [
      RoleNames.ADMIN,
      AlbumAdminPermissionsService.createAlbumEntity,
    ];
  }
}
