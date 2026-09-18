import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { WishlistItemFormModule } from '@music-collection/domain/wishlist-item';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-item-edit',
	templateUrl: './wishlist-item-edit.component.html',
	styleUrls: ['./wishlist-item-edit.component.scss'],
	imports: [WishlistItemFormModule],
})
export class WishlistItemEditComponent extends BaseComponent implements OnInit {
	private activatedRoute = inject(ActivatedRoute);

	public wishlistItemId!: string;

	public ngOnInit(): void {
		this.wishlistItemId =
			this.activatedRoute.snapshot.params['wishlistItemId'];
	}
}
