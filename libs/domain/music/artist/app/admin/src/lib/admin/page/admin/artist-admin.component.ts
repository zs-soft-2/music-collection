import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ArtistStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { ArtistAdminPermissionsService } from '../../service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-admin',
	templateUrl: './artist-admin.component.html',
	styleUrls: ['./artist-admin.component.scss'],
  standalone: false,
})
export class ArtistAdminComponent extends BaseComponent implements OnInit {
	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private artistStateService: ArtistStateService
	) {
		super();
	}

	public clickHandler(): void {
		this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
	}

	public importClickHandler(): void {
		this.router.navigate(['import'], { relativeTo: this.activatedRoute });
	}

	public ngOnInit(): void {
		this.isNewEntityButtonEnabled$ =
			this.artistStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			ArtistAdminPermissionsService.createArtistEntity,
		];
	}
}
