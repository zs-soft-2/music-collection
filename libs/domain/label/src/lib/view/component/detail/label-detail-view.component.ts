import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-label-detail-view',
  templateUrl: './label-detail-view.component.html',
  styleUrls: ['./label-detail-view.component.scss'],
})
export class LabelDetailViewComponent extends BaseComponent {}
