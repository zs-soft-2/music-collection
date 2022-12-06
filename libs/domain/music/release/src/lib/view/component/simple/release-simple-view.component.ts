import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
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
	public media: Media;
	@Input()
	public height = '220';
	@Input()
	public release!: ReleaseEntity;
	@Output()
	public selectRelease: EventEmitter<void>;
	@Input()
	public width = '220';

	public constructor() {
		super();

		this.selectRelease = new EventEmitter();

		this.media = {
			cd: MediaEnum.cd,
			dvd: MediaEnum.dvd,
			vinyl: MediaEnum.vinyl,
		};
	}

	public releaseClickHandler(): void {
		this.selectRelease.emit();
	}
}
