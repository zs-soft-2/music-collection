import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { LabelListService } from './label-list.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LabelListService],
  selector: 'mc-label-list',
  templateUrl: './label-list.component.html',
  styleUrls: ['./label-list.component.scss'],
})
export class LabelListComponent extends BaseComponent implements OnInit {
  public constructor(private componentService: LabelListService) {
    super();
  }

  public ngOnInit(): void {
    this.componentService.init$().pipe().subscribe();
  }
}
