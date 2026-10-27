import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { FormsModule } from '@angular/forms';
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
import { AutoComplete } from 'primeng/autocomplete';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
	CollectionColumnDirective,
	CollectionListComponent,
	EntityCardComponent,
	ViewActionComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [LabelTableService],
	selector: 'mc-label-table',
	templateUrl: './label-table.component.html',
	styleUrls: ['./label-table.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		CollectionColumnDirective,
		CollectionListComponent,
		EntityCardComponent,
		ViewActionComponent,
	],
})
export class LabelTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(LabelTableService);

	public params$!: Observable<LabelTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	public clearSearch(): void {
		this.componentService.clearSearch();
	}

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

	/** Where the eye leads: the page that shows this label. */
	public viewLink(label: LabelEntity): unknown[] {
		return this.componentService.viewLink(label);
	}
}
