import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import {
	MusicianStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { MusicianAdminPermissionsService } from '../../service';
import { Bind } from 'primeng/bind';
import { NgxPermissionsModule } from 'ngx-permissions';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-musician-admin',
	templateUrl: './musician-admin.component.html',
	styleUrls: ['./musician-admin.component.scss'],
	imports: [Bind, NgxPermissionsModule, Button, RouterOutlet, AsyncPipe],
})
export class MusicianAdminComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);
	private router = inject(Router);
	private musicianStateService = inject(MusicianStateService);

	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public clickHandler(): void {
		this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
	}

	public ngOnInit(): void {
		this.isNewEntityButtonEnabled$ =
			this.musicianStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			MusicianAdminPermissionsService.createMusicianEntity,
		];
	}
}
