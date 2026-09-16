import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistEntity,
	ArtistStateService,
	AuthenticationStateService,
	EntityTypeEnum,
	FormatList,
	MediaList,
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
	private activatedRoute = inject(ActivatedRoute);
	private albumStateService = inject(AlbumStateService);
	private artistStateService = inject(ArtistStateService);
	private authorizationStateService = inject(AuthenticationStateService);
	private componentUtil = inject(WishlistItemUtilService);
	private router = inject(Router);
	private wishlistItemStateService = inject(WishlistItemStateService);
	private wishlistItemUtilService = inject(WishlistItemUtilService);

	private formGroup!: FormGroup;
	private params!: WishlistItemFormParams;
	private params$$: ReplaySubject<WishlistItemFormParams>;
	private wishlistItem!: WishlistItemEntity | undefined;

	public constructor() {
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
					this.authorizationStateService.selectAuthenticatedUser$(),
				])
			),
			switchMap(([wishlistItem, artists, albums, user]) => {
				this.wishlistItem = wishlistItem;
				this.formGroup =
					this.wishlistItemUtilService.createOrUpdateFormGroup(
						this.formGroup,
						wishlistItem,
						user
					);
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
			this.wishlistItemUtilService.createSearchParamsForAlbum(
				term,
				this.formGroup.value['artistReference']?.uid
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
			mediaList: MediaList,
		};

		return wishlistItemFormParams;
	}

	private updateWishlistItem(): void {
		const wishlistItem: WishlistItemEntityUpdate =
			this.componentUtil.updateEntity(this.params.formGroup);

		this.wishlistItemStateService.dispatchUpdateEntityAction(wishlistItem);
	}
}
