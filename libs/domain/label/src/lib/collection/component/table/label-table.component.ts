import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
  LabelEntity,
  LabelTableParams,
  BaseComponent,
  GenreEnum,
  StyleEnum,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { LabelTableService } from './label-table.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LabelTableService],
  selector: 'mc-label-table',
  templateUrl: './label-table.component.html',
  styleUrls: ['./label-table.component.scss'],
})
export class LabelTableComponent extends BaseComponent implements OnInit {
  public params$!: Observable<LabelTableParams>;

  public constructor(private componentService: LabelTableService) {
    super();
  }

  public deleteLabel(label: LabelEntity): void {
    console.log(label);
  }

  public editLabel(label: LabelEntity): void {
    this.componentService.editLabel(label);
  }

  public ngOnInit(): void {
    this.params$ = this.componentService.init$();
  }
}
