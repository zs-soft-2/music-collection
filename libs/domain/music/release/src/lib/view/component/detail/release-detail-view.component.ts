import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-detail-view',
	templateUrl: './release-detail-view.component.html',
	styleUrls: ['./release-detail-view.component.scss'],
  standalone: false,
})
export class ReleaseDetailViewComponent extends BaseComponent {}
