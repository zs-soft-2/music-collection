import { Observable } from 'rxjs';

import { AsyncPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import {
	CollectionColumnDirective,
	CollectionListComponent,
	EntityCardComponent,
	ViewActionComponent,
} from '@music-collection/ui';

import { MusicianTableService } from './musician-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MusicianTableService],
	selector: 'mc-musician-table',
	templateUrl: './musician-table.component.html',
	styleUrls: ['./musician-table.component.scss'],
	imports: [
		FormsModule,
		ButtonDirective,
		IconField,
		InputIcon,
		InputText,
		AsyncPipe,
		DatePipe,
		NgTemplateOutlet,
		CollectionColumnDirective,
		CollectionListComponent,
		EntityCardComponent,
		ViewActionComponent,
	],
})
export class MusicianTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(MusicianTableService);

	public params$!: Observable<MusicianTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	public editMusician(musician: MusicianEntity): void {
		this.componentService.editMusician(musician);
	}

	public filter(query: string): void {
		this.componentService.filter(query);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	/** Where the eye leads: the page that shows this musician. */
	public viewLink(musician: MusicianEntity): unknown[] {
		return this.componentService.viewLink(musician);
	}
}
