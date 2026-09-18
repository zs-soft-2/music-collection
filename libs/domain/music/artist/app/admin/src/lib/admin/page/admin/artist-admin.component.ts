import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import {
	ArtistStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { ArtistAdminPermissionsService } from '../../service';
import { Bind } from 'primeng/bind';
import { NgxPermissionsModule } from 'ngx-permissions';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-admin',
	templateUrl: './artist-admin.component.html',
	styleUrls: ['./artist-admin.component.scss'],
	imports: [Bind, NgxPermissionsModule, Button, RouterOutlet, AsyncPipe],
})
export class ArtistAdminComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);
	private router = inject(Router);
	private artistStateService = inject(ArtistStateService);

	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

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
