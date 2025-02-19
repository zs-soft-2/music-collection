import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ArtistFormParams, BaseComponent } from '@music-collection/api';

import { ArtistFormService } from './artist-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistFormService],
	selector: 'mc-artist-form',
	templateUrl: './artist-form.component.html',
	styleUrls: ['./artist-form.component.scss'],
  standalone: false,
})
export class ArtistFormComponent extends BaseComponent implements OnInit {
	public params$!: Observable<ArtistFormParams>;

	public constructor(private componentService: ArtistFormService) {
		super();
	}

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public mainImageUpload(event: any): void {
		this.componentService.mainImageUpload(event['files'][0]);
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchDocument(event: any): void {
		this.componentService.searchDocument(event['query']);
	}
}
