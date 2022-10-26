import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemFormParams,
	CollectionItemStateService,
	CollectionItemUtilService,
	ArtistEntity,
	ArtistStateService,
	StyleList,
	ReleaseEntity,
	ReleaseStateService,
	AuthenticationStateService,
	User,
} from '@music-collection/api';

@Injectable()
export class CollectionItemFormService {
	private collectionItem!: CollectionItemEntity | undefined;
	private params!: CollectionItemFormParams;
	private params$$: ReplaySubject<CollectionItemFormParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private collectionItemStateService: CollectionItemStateService,
		private collectionItemUtilService: CollectionItemUtilService,
		private releaseStateService: ReleaseStateService,
		private componentUtil: CollectionItemUtilService,
		private router: Router,
		private authenticationStateService: AuthenticationStateService
	) {
		this.params$$ = new ReplaySubject();
	}

	public cancel(): void {
		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<CollectionItemFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.collectionItemStateService.selectEntityById$(
						data['collection-itemId']
					),
					this.releaseStateService.selectSearchResult$(),
					this.authenticationStateService.selectAuthenticatedUser$(),
				])
			),
			switchMap(([collectionItem, artists, authenticatedUser]) => {
				this.collectionItem = collectionItem;
				this.params = this.createCollectionItemParams(
					collectionItem,
					artists,
					authenticatedUser
				);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchRelease(query: string): void {
		this.releaseStateService.dispatchSearch(query);
	}

	public submit(): void {
		if (this.collectionItem) {
			this.updateCollectionItem();
		} else {
			this.addCollectionItem();
		}

		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	private addCollectionItem(): void {
		const collectionItem: CollectionItemEntityAdd =
			this.componentUtil.createEntity(this.params.formGroup);

		this.collectionItemStateService.dispatchAddEntityAction(collectionItem);
	}

	private createCollectionItemParams(
		collectionItem: CollectionItemEntity | undefined,
		releases: ReleaseEntity[],
		authenticatedUser: User | undefined
	): CollectionItemFormParams {
		const formGroup = this.collectionItemUtilService.createFormGroupByUser(
			collectionItem,
			authenticatedUser
		);

		const collectionItemFormParams: CollectionItemFormParams = {
			releases,
			formGroup,
		};

		return collectionItemFormParams;
	}

	private updateCollectionItem(): void {
		const collectionItem: CollectionItemEntityUpdate =
			this.componentUtil.updateEntity(this.params.formGroup);

		this.collectionItemStateService.dispatchUpdateEntityAction(
			collectionItem
		);
	}
}
