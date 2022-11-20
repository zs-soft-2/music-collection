import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseComponent, MediaEnum, ReleaseEntity } from '@music-collection/api';

export interface Media {
	[x: string]: MediaEnum;
}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-simple-view',
	templateUrl: './release-simple-view.component.html',
	styleUrls: ['./release-simple-view.component.scss'],
})
export class ReleaseSimpleViewComponent extends BaseComponent {
	@Input()
	public release!: ReleaseEntity;

	@Input()
	public width = '220';

	public media: Media;

	public constructor() {
		super();

		this.media = {
			cd: MediaEnum.cd,
			vinyl: MediaEnum.vinyl,
		};
	}
}
