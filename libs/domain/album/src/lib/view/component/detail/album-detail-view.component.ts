import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-album-detail-view',
  templateUrl: './album-detail-view.component.html',
  styleUrls: ['./album-detail-view.component.scss'],
})
export class AlbumDetailViewComponent extends BaseComponent {}
