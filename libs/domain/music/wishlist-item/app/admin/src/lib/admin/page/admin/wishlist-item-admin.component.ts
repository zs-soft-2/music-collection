import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
  standalone: false,
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
