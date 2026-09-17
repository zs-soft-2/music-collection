import { Observable } from 'rxjs';

import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
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
import { DataView } from 'primeng/dataview';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { SortIcon, SortableColumn, Table } from 'primeng/table';

import {
	MusicianTableService,
	MusicianTableView,
} from './musician-table.service';

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
		DataView,
		IconField,
		InputIcon,
		InputText,
		AsyncPipe,
		NgTemplateOutlet,
	],
})
export class MusicianTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(MusicianTableService);

	public params$!: Observable<MusicianTableParams>;

	public readonly view = this.componentService.view;

	public readonly viewOptions: {
		value: MusicianTableView;
		label: string;
		icon: string;
	}[] = [
		{ value: 'table', label: 'Table', icon: 'pi pi-list' },
		{ value: 'cards', label: 'Cards', icon: 'pi pi-th-large' },
	];

	public editMusician(musician: MusicianEntity): void {
		this.componentService.editMusician(musician);
	}

	public filter(event: Event): void {
		this.componentService.filter((event.target as HTMLInputElement).value);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public setView(view: MusicianTableView): void {
		this.componentService.setView(view);
	}
}
