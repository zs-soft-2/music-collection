import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	LabelEntity,
	LabelTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { LabelTableService } from './label-table.service';
import { Bind } from 'primeng/bind';
import { Table, SortableColumn, SortIcon } from 'primeng/table';
import { AutoComplete } from 'primeng/autocomplete';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import { DataView } from 'primeng/dataview';
import {
	CollectionViewToggleComponent,
	EntityCardComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelTableService],
	selector: 'mc-label-table',
	templateUrl: './label-table.component.html',
	styleUrls: ['./label-table.component.scss'],
	imports: [
		Bind,
		Table,
		SortableColumn,
		SortIcon,
		AutoComplete,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		DataView,
		CollectionViewToggleComponent,
		EntityCardComponent,
	],
})
export class LabelTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(LabelTableService);

	public params$!: Observable<LabelTableParams>;

	public readonly collectionView = this.componentService.collectionView;

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
