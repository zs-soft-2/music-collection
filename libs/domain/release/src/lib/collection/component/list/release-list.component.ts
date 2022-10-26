import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { ReleaseListService } from './release-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseListService],
	selector: 'mc-release-list',
	templateUrl: './release-list.component.html',
	styleUrls: ['./release-list.component.scss'],
})
export class ReleaseListComponent extends BaseComponent implements OnInit {
	public constructor(private componentService: ReleaseListService) {
		super();
	}

	public ngOnInit(): void {
		this.componentService.init$().pipe().subscribe();
	}
}
