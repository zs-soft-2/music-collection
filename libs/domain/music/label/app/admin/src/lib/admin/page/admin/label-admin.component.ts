import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import {
	LabelStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { LabelAdminPermissionsService } from '../../service';
import { Bind } from 'primeng/bind';
import { NgxPermissionsModule } from 'ngx-permissions';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-label-admin',
	templateUrl: './label-admin.component.html',
	styleUrls: ['./label-admin.component.scss'],
	imports: [
		...I18N_IMPORTS,
		Bind,
		NgxPermissionsModule,
		Button,
		RouterOutlet,
		AsyncPipe,
	],
})
export class LabelAdminComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);
	private router = inject(Router);
	private labelStateService = inject(LabelStateService);

	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

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
