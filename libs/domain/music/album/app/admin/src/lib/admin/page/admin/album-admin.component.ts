import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import {
	AlbumStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { AlbumAdminPermissionsService } from '../../service';
import { Bind } from 'primeng/bind';
import { NgxPermissionsModule } from 'ngx-permissions';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-admin',
	templateUrl: './album-admin.component.html',
	styleUrls: ['./album-admin.component.scss'],
	imports: [Bind, NgxPermissionsModule, Button, RouterOutlet, AsyncPipe],
})
export class AlbumAdminComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);
	private router = inject(Router);
	private albumStateService = inject(AlbumStateService);

	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public clickHandler(): void {
		this.router.navigate(['edit', 0], { relativeTo: this.activatedRoute });
	}

	public ngOnInit(): void {
		this.isNewEntityButtonEnabled$ =
			this.albumStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			AlbumAdminPermissionsService.createAlbumEntity,
		];
	}
}
