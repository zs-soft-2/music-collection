import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistEntity,
	ArtistStateService,
	EntityTypeEnum,
	FormatList,
	SearchParams,
	WishlistItemEntity,
	WishlistItemEntityAdd,
	WishlistItemEntityUpdate,
	WishlistItemFormParams,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

@Injectable()
export class WishlistItemFormService {
	private wishlistItem!: WishlistItemEntity | undefined;
	private formGroup!: FormGroup;
	private params!: WishlistItemFormParams;
	private params$$: ReplaySubject<WishlistItemFormParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private wishlistItemStateService: WishlistItemStateService,
		private wishlistItemUtilService: WishlistItemUtilService,
		private componentUtil: WishlistItemUtilService,
		private albumStateService: AlbumStateService,
		private artistStateService: ArtistStateService,
		private router: Router
	) {
		this.params$$ = new ReplaySubject();
	}

	public cancel(): void {
		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<WishlistItemFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.wishlistItemStateService.selectEntityById$(
						data['wishlistItemId']
					),
					this.artistStateService.selectSearchResult$(),
					this.albumStateService.selectSearchResult$(),
				])
			),
			switchMap(([wishlistItem, artists, albums]) => {
				this.wishlistItem = wishlistItem;
				this.formGroup =
					this.wishlistItemUtilService.createFormGroup(wishlistItem);
				this.params = this.createWishlistItemParams(
					this.formGroup,
					artists,
					albums
				);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public mainImageUpload(file: File): void {
		console.log(file);
	}

	public searchAlbum(term: string): void {
		const searchParams: SearchParams =
			this.wishlistItemUtilService.createSearchParams(
				EntityTypeEnum.Album,
				term
			);
		this.albumStateService.dispatchSearch(searchParams);
	}

	public searchArtist(term: string): void {
		const searchParams: SearchParams =
			this.wishlistItemUtilService.createSearchParams(
				EntityTypeEnum.Artist,
				term
			);

		this.artistStateService.dispatchSearch(searchParams);
	}

	public submit(): void {
		if (this.wishlistItem) {
			this.updateWishlistItem();
		} else {
			this.addWishlistItem();
		}

		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	private addWishlistItem(): void {
		const wishlistItem: WishlistItemEntityAdd =
			this.componentUtil.createEntity(this.params.formGroup);

		this.wishlistItemStateService.dispatchAddEntityAction(wishlistItem);
	}

	private createWishlistItemParams(
		formGroup: FormGroup,
		artists: ArtistEntity[],
		albums: AlbumEntity[]
	): WishlistItemFormParams {
		const wishlistItemFormParams: WishlistItemFormParams = {
			albums,
			artists,
			formGroup,
			formatList: FormatList,
		};

		return wishlistItemFormParams;
	}

	private updateWishlistItem(): void {
		const wishlistItem: WishlistItemEntityUpdate =
			this.componentUtil.updateEntity(this.params.formGroup);

		this.wishlistItemStateService.dispatchUpdateEntityAction(wishlistItem);
	}
}
