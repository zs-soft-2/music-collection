import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AlbumFormParams, BaseComponent } from '@music-collection/api';

import { AlbumFormService } from './album-form.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AlbumFormService],
  selector: 'mc-album-form',
  templateUrl: './album-form.component.html',
  styleUrls: ['./album-form.component.scss'],
})
export class AlbumFormComponent extends BaseComponent implements OnInit {
  public params$!: Observable<AlbumFormParams>;

  public constructor(private componentService: AlbumFormService) {
    super();
  }

  public cancel(): void {
    this.componentService.cancel();
  }

  public ngOnInit(): void {
    this.params$ = this.componentService.init$();
  }

  public submit(): void {
    this.componentService.submit();
  }

  public searchArtist(event: any): void {
    this.componentService.searchArtist(event['query']);
  }
}
