import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	ReleaseEntity,
	ReleaseTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { ReleaseTableService } from './release-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseTableService],
	selector: 'mc-release-table',
	templateUrl: './release-table.component.html',
	styleUrls: ['./release-table.component.scss'],
})
export class ReleaseTableComponent extends BaseComponent implements OnInit {
	public params$!: Observable<ReleaseTableParams>;

	public constructor(private componentService: ReleaseTableService) {
		super();
	}

	public deleteRelease(release: ReleaseEntity): void {
		console.log(release);
	}

	public editRelease(release: ReleaseEntity): void {
		this.componentService.editRelease(release);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
