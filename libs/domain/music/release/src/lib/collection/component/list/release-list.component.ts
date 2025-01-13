import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent, ReleaseListParams } from '@music-collection/api';

import { ReleaseListService } from './release-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseListService],
	selector: 'mc-release-list',
	templateUrl: './release-list.component.html',
	styleUrls: ['./release-list.component.scss'],
  standalone: false,
})
export class ReleaseListComponent extends BaseComponent implements OnInit {
	public params$!: Observable<ReleaseListParams>;

	public constructor(private componentService: ReleaseListService) {
		super();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
