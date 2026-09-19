import { Observable } from 'rxjs';

import { AsyncPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
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
	CollectionViewToggleComponent,
	EntityCardComponent,
} from '@music-collection/ui';

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
		DataView,
		IconField,
		InputIcon,
		InputText,
		AsyncPipe,
		DatePipe,
		NgTemplateOutlet,
		CollectionViewToggleComponent,
		EntityCardComponent,
	],
})
export class MusicianTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(MusicianTableService);

	public params$!: Observable<MusicianTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public editMusician(musician: MusicianEntity): void {
		this.componentService.editMusician(musician);
	}

	public filter(event: Event): void {
		this.componentService.filter((event.target as HTMLInputElement).value);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
