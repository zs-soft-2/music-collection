import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
	EntityTypeEnum,
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
	LabelFormParams,
	LabelStateService,
	LabelUtilService,
	ReturnNavigationService,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class LabelFormService {
	private activatedRoute = inject(ActivatedRoute);
	private labelStateService = inject(LabelStateService);
	private labelUtilService = inject(LabelUtilService);
	private componentUtil = inject(LabelUtilService);
	private returnNavigation = inject(ReturnNavigationService);

	private label!: LabelEntity | undefined;
	private params!: LabelFormParams;
	private params$$: ReplaySubject<LabelFormParams>;

	public constructor() {
		this.params$$ = new ReplaySubject();
	}

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	public init$(): Observable<LabelFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.labelStateService.selectEntityById$(data['labelId']),
					this.labelStateService.selectSearchResult$(),
				])
			),
			switchMap(([label, labels]) => {
				this.label = label;
				this.params = this.createLabelParams(label, labels);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchLabel(term: string): void {
		const searchParams: SearchParams =
			this.labelUtilService.createSearchParams(
				EntityTypeEnum.Label,
				term
			);

		this.labelStateService.dispatchSearch(searchParams);
	}

	public submit(): void {
		if (this.label) {
			this.updateLabel();
		} else {
			this.addLabel();
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	private addLabel(): void {
		const label: LabelEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.labelStateService.dispatchAddEntityAction(label);
	}

	private createLabelParams(
		label: LabelEntity | undefined,
		labels: LabelEntity[]
	): LabelFormParams {
		const formGroup = this.labelUtilService.createFormGroup(label);

		const labelFormParams: LabelFormParams = {
			labels,
			formGroup,
		};

		return labelFormParams;
	}

	private updateLabel(): void {
		const label: LabelEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.labelStateService.dispatchUpdateEntityAction(label);
	}
}
