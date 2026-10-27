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
	WishlistItemStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { WishlistItemAdminPermissionsService } from '../../service';
import { Bind } from 'primeng/bind';
import { NgxPermissionsModule } from 'ngx-permissions';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-admin',
	templateUrl: './wishlist-item-admin.component.html',
	styleUrls: ['./wishlist-item-admin.component.scss'],
	imports: [
		...I18N_IMPORTS,
		Bind,
		NgxPermissionsModule,
		Button,
		RouterOutlet,
		AsyncPipe,
	],
})
export class WishlistItemAdminComponent
	extends BaseComponent
	implements OnInit
{
	private activatedRoute = inject(ActivatedRoute);
	private router = inject(Router);
	private wishlistItemStateService = inject(WishlistItemStateService);

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
			this.wishlistItemStateService.selectNewEntityButtonEnabled$();

		this.initButtonPermissions();
	}

	private initButtonPermissions(): void {
		this.buttonPermissions = [
			RoleNames.ADMIN,
			WishlistItemAdminPermissionsService.createWishlistItemEntity,
		];
	}
}
