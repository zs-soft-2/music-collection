import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LabelEntity,
  LabelEntityAdd,
  LabelEntityUpdate,
  LabelFormParams,
  LabelStateService,
  LabelUtilService,
} from '@music-collection/api';

@Injectable()
export class LabelFormService {
  private label!: LabelEntity | undefined;
  private params!: LabelFormParams;
  private params$$: ReplaySubject<LabelFormParams>;

  public constructor(
    private activatedRoute: ActivatedRoute,
    private labelStateService: LabelStateService,
    private labelUtilService: LabelUtilService,
    private componentUtil: LabelUtilService,
    private router: Router
  ) {
    this.params$$ = new ReplaySubject();
  }

  public cancel(): void {
    this.router.navigate(['../../list'], {
      relativeTo: this.activatedRoute,
    });
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

  public searchLabel(query: string): void {
    this.labelStateService.dispatchSearch(query);
  }

  public submit(): void {
    if (this.label) {
      this.updateLabel();
    } else {
      this.addLabel();
    }

    this.router.navigate(['../../list'], {
      relativeTo: this.activatedRoute,
    });
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
