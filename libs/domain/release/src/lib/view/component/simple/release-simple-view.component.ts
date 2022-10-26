import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-simple-view',
	templateUrl: './release-simple-view.component.html',
	styleUrls: ['./release-simple-view.component.scss'],
})
export class ReleaseSimpleViewComponent extends BaseComponent {}
