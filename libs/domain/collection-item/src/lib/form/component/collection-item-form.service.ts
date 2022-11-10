import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemFormParams,
	CollectionItemStateService,
	CollectionItemUtilService,
	EntityTypeEnum,
	ReleaseEntity,
	ReleaseStateService,
	SearchParams,
	User,
} from '@music-collection/api';

@Injectable()
export class CollectionItemFormService {
	private collectionItem!: CollectionItemEntity | undefined;
	private params!: CollectionItemFormParams;
	private params$$: ReplaySubject<CollectionItemFormParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private authenticationStateService: AuthenticationStateService,
		private collectionItemStateService: CollectionItemStateService,
		private collectionItemUtilService: CollectionItemUtilService,
		private releaseStateService: ReleaseStateService,
		private componentUtil: CollectionItemUtilService,
		private router: Router
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
						data['collectionItemId']
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

	public searchRelease(term: string): void {
		const searchParams: SearchParams =
			this.collectionItemUtilService.createSearchParams(
				EntityTypeEnum.CollectionItem,
				term
			);
		this.releaseStateService.dispatchSearch(searchParams);
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
		authenticatedUser: User
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
