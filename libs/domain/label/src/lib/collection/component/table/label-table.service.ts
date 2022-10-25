import { Observable, of, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LabelEntity,
  LabelStateService,
  LabelTableParams,
  BaseComponent,
} from '@music-collection/api';

@Injectable()
export class LabelTableService extends BaseComponent {
  private params!: LabelTableParams;
  private params$$: ReplaySubject<LabelTableParams>;

  public constructor(
    private activatedRoute: ActivatedRoute,
    private labelStateService: LabelStateService,
    private router: Router
  ) {
    super();

    this.params$$ = new ReplaySubject();
  }

  public editLabel(label: LabelEntity): void {
    this.router.navigate(['../edit', label?.uid], {
      relativeTo: this.activatedRoute,
    });
  }

  public init$(): Observable<LabelTableParams> {
    return this.labelStateService.selectEntities$().pipe(
      switchMap((labels) => {
        this.params = {
          labels,
        };

        this.params$$.next(this.params);

        return this.params$$;
      })
    );
  }
}
