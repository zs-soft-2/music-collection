import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	BaseComponent,
	ReleaseEntity,
	ReleaseTableParams,
} from '@music-collection/api';

import { ReleaseTableService } from './release-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseTableService],
	selector: 'mc-release-table',
	templateUrl: './release-table.component.html',
	styleUrls: ['./release-table.component.scss'],
  standalone: false,
})
export class ReleaseTableComponent extends BaseComponent implements OnInit {
	public params$!: Observable<ReleaseTableParams>;

	public constructor(private componentService: ReleaseTableService) {
		super();
	}

	public deleteRelease(release: ReleaseEntity): void {
		this.componentService.deleteRelease(release);
	}

	public editRelease(release: ReleaseEntity): void {
		this.componentService.editRelease(release);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public searchHandler(event: any): void {
		this.componentService.searchHandler(event['query']);
	}
}
