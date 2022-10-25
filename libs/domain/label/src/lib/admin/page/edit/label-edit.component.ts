import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'mc-label-edit',
  templateUrl: './label-edit.component.html',
  styleUrls: ['./label-edit.component.scss'],
})
export class LabelEditComponent extends BaseComponent implements OnInit {
  public labelId!: string;

  public constructor(private activatedRoute: ActivatedRoute) {
    super();
  }

  public ngOnInit(): void {
    this.labelId = this.activatedRoute.snapshot.params['labelId'];
  }
}
