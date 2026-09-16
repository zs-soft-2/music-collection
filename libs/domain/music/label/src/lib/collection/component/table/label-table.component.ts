import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {
	LabelEntity,
	LabelTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { LabelTableService } from './label-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelTableService],
	selector: 'mc-label-table',
	templateUrl: './label-table.component.html',
	styleUrls: ['./label-table.component.scss'],
	standalone: false,
})
export class LabelTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(LabelTableService);

	public params$!: Observable<LabelTableParams>;

	public deleteLabel(label: LabelEntity): void {
		console.log(label);
	}

	public editLabel(label: LabelEntity): void {
		this.componentService.editLabel(label);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public searchHandler(event: any): void {
		this.componentService.searchHandler(event['query']);
	}
}
