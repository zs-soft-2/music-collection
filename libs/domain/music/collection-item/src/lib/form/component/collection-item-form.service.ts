import { combineLatest, Observable, of, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemEntityAdd,
	CollectionItemEntityUpdate,
	CollectionItemFormParams,
	CollectionItemPlacement,
	CollectionItemPlacementParams,
	CollectionItemStateService,
	CollectionItemUtilService,
	EntityTypeEnum,
	MAX_SHELF_POSITION,
	ReleaseEntity,
	ReleaseStateService,
	ReturnNavigationService,
	SearchParams,
	ShelfLayoutService,
	ShelfUnitLayout,
	User,
	placementInLayout,
	unitSpots,
} from '@music-collection/api';

/** The chosen compartment, as the select carries it. */
const spotValue = (row: number, column: number): string => `${row}:${column}`;

@Injectable()
export class CollectionItemFormService {
	private activatedRoute = inject(ActivatedRoute);
	private authenticationStateService = inject(AuthenticationStateService);
	private collectionItemStateService = inject(CollectionItemStateService);
	private collectionItemUtilService = inject(CollectionItemUtilService);
	private releaseStateService = inject(ReleaseStateService);
	private componentUtil = inject(CollectionItemUtilService);
	private returnNavigation = inject(ReturnNavigationService);
	/**
	 * Only the app itself knows the collector's furniture (it is a setting of
	 * theirs). Without it the form simply has no shelf to file the copy into.
	 */
	private shelfLayoutService = inject(ShelfLayoutService, {
		optional: true,
	});

	private collectionItem!: CollectionItemEntity | undefined;
	private params!: CollectionItemFormParams;
	private params$$: ReplaySubject<CollectionItemFormParams>;
	private units: ShelfUnitLayout[] = [];
	/** The place the form holds now; it starts as the one the copy has. */
	private placement: CollectionItemPlacement | null = null;
	private unitId = '';

	public constructor() {
		this.params$$ = new ReplaySubject();
	}

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
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
					this.shelfLayoutService?.units$() ?? of([]),
				])
			),
			switchMap(([collectionItem, artists, authenticatedUser, units]) => {
				const opened = this.collectionItem?.uid !== collectionItem?.uid;

				this.collectionItem = collectionItem;
				this.units = units;

				// The place follows the copy that was opened; from then on it
				// is the collector's to change, and a release searched for
				// meanwhile must not put the copy back where it came from.
				if (opened) {
					this.placement = collectionItem?.placement ?? null;
					this.unitId = this.placement?.unitId ?? '';
				}
				if (!this.unitId) {
					this.unitId = this.units[0]?.id ?? '';
				}

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

	/**
	 * Another piece of furniture: the compartment went with the old one, so
	 * the copy is filed by the shelf again until one is picked here.
	 */
	public chooseUnit(unitId: string): void {
		this.unitId = unitId;
		this.setPlacement(null);
	}

	public chooseSpot(spot: string): void {
		const [row, column] = spot.split(':').map(Number);
		const standing = this.placement;
		const staying =
			standing &&
			standing.unitId === this.unitId &&
			standing.row === row &&
			standing.column === column;

		this.setPlacement({
			unitId: this.unitId,
			row,
			column,
			position: staying ? standing.position : 1,
		});
	}

	public choosePosition(position: number): void {
		if (this.placement) {
			this.setPlacement({ ...this.placement, position });
		}
	}

	/** Takes the place back: the shelf files the copy again. */
	public clearPlace(): void {
		this.setPlacement(null);
	}

	public submit(): void {
		if (this.collectionItem) {
			this.updateCollectionItem();
		} else {
			this.addCollectionItem();
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	private addCollectionItem(): void {
		const collectionItem: CollectionItemEntityAdd =
			this.componentUtil.createEntity(this.params.formGroup);

		this.collectionItemStateService.dispatchAddEntityAction(collectionItem);
	}

	private setPlacement(placement: CollectionItemPlacement | null): void {
		this.placement = placement;
		this.params.formGroup.get('placement')?.setValue(placement);
		this.params = {
			...this.params,
			placement: this.createPlacementParams(),
		};

		this.params$$.next(this.params);
	}

	private createPlacementParams(): CollectionItemPlacementParams {
		const unit = this.units.find((drawn) => drawn.id === this.unitId);
		const placement = this.placement;

		return {
			units: this.units.map((drawn, index) => ({
				value: drawn.id,
				label: drawn.name || `Shelf ${index + 1}`,
			})),
			unitId: this.unitId,
			spots: unit
				? unitSpots(unit).map((spot) => ({
						value: spotValue(spot.row, spot.column),
						label: spot.label,
					}))
				: [],
			spot:
				placement && placement.unitId === this.unitId
					? spotValue(placement.row, placement.column)
					: null,
			position: placement?.position ?? 1,
			maxPosition: MAX_SHELF_POSITION,
			// A place no drawn compartment answers to any more is kept, but
			// there is nothing to show it on.
			lost: !!placement && !placementInLayout(placement, this.units),
		};
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

		formGroup.get('placement')?.setValue(this.placement);

		const collectionItemFormParams: CollectionItemFormParams = {
			releases: releases.map((release) => ({
				...release,
				nameAndMedia: `${release.name} (${release.media})`,
			})),
			formGroup,
			placement: this.createPlacementParams(),
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
