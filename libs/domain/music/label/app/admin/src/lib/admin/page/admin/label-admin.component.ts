import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	LabelStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { LabelAdminPermissionsService } from '../../service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-label-admin',
	templateUrl: './label-admin.component.html',
	styleUrls: ['./label-admin.component.scss'],
	standalone: false,
})
export class LabelAdminComponent extends BaseComponent implements OnInit {
	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private labelStateService: LabelStateService
	) {
		super();
	}

	public clickHandler(): void {
		this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
	}

	public ngOnInit(): void {
		this.isNewEntityButtonEnabled$ =
			this.labelStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			LabelAdminPermissionsService.createLabelEntity,
		];
	}
}
