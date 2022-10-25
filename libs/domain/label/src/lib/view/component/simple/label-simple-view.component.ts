import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-label-simple-view',
  templateUrl: './label-simple-view.component.html',
  styleUrls: ['./label-simple-view.component.scss'],
})
export class LabelSimpleViewComponent extends BaseComponent {}
