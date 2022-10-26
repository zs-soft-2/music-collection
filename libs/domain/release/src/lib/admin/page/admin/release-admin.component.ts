import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ReleaseStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { ReleaseAdminPermissionsService } from '../../service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-admin',
	templateUrl: './release-admin.component.html',
	styleUrls: ['./release-admin.component.scss'],
})
export class ReleaseAdminComponent extends BaseComponent implements OnInit {
	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private releaseStateService: ReleaseStateService
	) {
		super();
	}

	public clickHandler(): void {
		this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
	}

	public ngOnInit(): void {
		this.isNewEntityButtonEnabled$ =
			this.releaseStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			ReleaseAdminPermissionsService.createReleaseEntity,
		];
	}
}
