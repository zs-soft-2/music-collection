import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	BaseComponent,
	ReleaseEntity,
	ReleaseTableParams,
} from '@music-collection/api';

import { ReleaseTableService } from './release-table.service';
import { Bind } from 'primeng/bind';
import { Table } from 'primeng/table';
import { PrimeTemplate } from 'primeng/api';
import { AutoComplete } from 'primeng/autocomplete';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseTableService],
	selector: 'mc-release-table',
	templateUrl: './release-table.component.html',
	styleUrls: ['./release-table.component.scss'],
	imports: [
		Bind,
		Table,
		PrimeTemplate,
		AutoComplete,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
	],
})
export class ReleaseTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseTableService);

	public params$!: Observable<ReleaseTableParams>;

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
