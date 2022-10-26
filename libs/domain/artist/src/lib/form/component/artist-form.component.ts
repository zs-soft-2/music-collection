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

	public submit(): void {
		this.componentService.submit();
	}
}
