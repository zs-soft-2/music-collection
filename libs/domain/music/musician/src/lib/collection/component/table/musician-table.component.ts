import { Observable } from 'rxjs';

import { AsyncPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	BaseComponent,
	MusicianEntity,
	MusicianTableParams,
} from '@music-collection/api';
import { ButtonDirective } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { SortIcon, SortableColumn, Table } from 'primeng/table';

import { MusicianTableService } from './musician-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MusicianTableService],
	selector: 'mc-musician-table',
	templateUrl: './musician-table.component.html',
	styleUrls: ['./musician-table.component.scss'],
	imports: [
		Table,
		SortableColumn,
		SortIcon,
		ButtonDirective,
		IconField,
		InputIcon,
		InputText,
		AsyncPipe,
	],
})
export class MusicianTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(MusicianTableService);

	public params$!: Observable<MusicianTableParams>;

	/** Fields the filter box searches in. */
	public readonly filterFields = ['name', 'realName', 'aliases'];

	public editMusician(musician: MusicianEntity): void {
		this.componentService.editMusician(musician);
	}

	public filter(table: Table, event: Event): void {
		table.filterGlobal(
			(event.target as HTMLInputElement).value,
			'contains'
		);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
