import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-edit',
	templateUrl: './wishlist-item-edit.component.html',
	styleUrls: ['./wishlist-item-edit.component.scss'],
})
export class WishlistItemEditComponent extends BaseComponent implements OnInit {
	public wishlistItemId!: string;

	public constructor(private activatedRoute: ActivatedRoute) {
		super();
	}

	public ngOnInit(): void {
		this.wishlistItemId =
			this.activatedRoute.snapshot.params['wishlistItemId'];
	}
}
