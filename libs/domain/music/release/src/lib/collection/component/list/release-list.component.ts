import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
	private componentService = inject(ReleaseListService);

	public params$!: Observable<ReleaseListParams>;

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
