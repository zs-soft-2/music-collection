import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
  AlbumEntity,
  AlbumTableParams,
  BaseComponent,
  GenreEnum,
  StyleEnum,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { AlbumTableService } from './album-table.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AlbumTableService],
  selector: 'mc-album-table',
  templateUrl: './album-table.component.html',
  styleUrls: ['./album-table.component.scss'],
})
export class AlbumTableComponent extends BaseComponent implements OnInit {
  public params$!: Observable<AlbumTableParams>;

  public constructor(private componentService: AlbumTableService) {
    super();
  }

  public deleteAlbum(album: AlbumEntity): void {
    console.log(album);
  }

  public editAlbum(album: AlbumEntity): void {
    this.componentService.editAlbum(album);
  }

  public ngOnInit(): void {
    this.params$ = this.componentService.init$();
  }
}
