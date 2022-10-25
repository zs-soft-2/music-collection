import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-album-simple-view',
  templateUrl: './album-simple-view.component.html',
  styleUrls: ['./album-simple-view.component.scss'],
})
export class AlbumSimpleViewComponent extends BaseComponent {}
