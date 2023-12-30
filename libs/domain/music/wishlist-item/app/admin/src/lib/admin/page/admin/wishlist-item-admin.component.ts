import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	WishlistItemStateService,
	BaseComponent,
	RoleNames,
} from '@music-collection/api';

import { WishlistItemAdminPermissionsService } from '../../service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-admin',
	templateUrl: './wishlist-item-admin.component.html',
	styleUrls: ['./wishlist-item-admin.component.scss'],
})
export class WishlistItemAdminComponent
	extends BaseComponent
	implements OnInit
{
	public buttonPermissions: string[] = [];
	public isNewEntityButtonEnabled$!: Observable<boolean>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private wishlistItemStateService: WishlistItemStateService
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
