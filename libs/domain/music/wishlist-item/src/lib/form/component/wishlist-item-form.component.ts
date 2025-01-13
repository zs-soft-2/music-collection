import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { WishlistItemFormParams, BaseComponent } from '@music-collection/api';

import { WishlistItemFormService } from './wishlist-item-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [WishlistItemFormService],
	selector: 'mc-wishlist-item-form',
	templateUrl: './wishlist-item-form.component.html',
	styleUrls: ['./wishlist-item-form.component.scss'],
  standalone: false,
})
export class WishlistItemFormComponent extends BaseComponent implements OnInit {
	public params$!: Observable<WishlistItemFormParams>;

	public constructor(private componentService: WishlistItemFormService) {
		super();
	}

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public submit(): void {
		this.componentService.submit();
	}

	public searchAlbumHandler(event: any): void {
		this.componentService.searchAlbum(event['query']);
	}

	public searchArtistHandler(event: any): void {
		this.componentService.searchArtist(event['query']);
	}
}
