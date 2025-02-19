import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ReleaseFormParams, BaseComponent } from '@music-collection/api';

import { ReleaseFormService } from './release-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseFormService],
	selector: 'mc-release-form',
	templateUrl: './release-form.component.html',
	styleUrls: ['./release-form.component.scss'],
  standalone: false,
})
export class ReleaseFormComponent extends BaseComponent implements OnInit {
	public params$!: Observable<ReleaseFormParams>;

	public constructor(private componentService: ReleaseFormService) {
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

	public searchAlbumHandler(event: any): void {
		this.componentService.searchAlbum(event['query']);
	}

	public searchArtistHandler(event: any): void {
		this.componentService.searchArtist(event['query']);
	}

	public searchLabelHandler(event: any): void {
		this.componentService.searchLabel(event['query']);
	}
}
