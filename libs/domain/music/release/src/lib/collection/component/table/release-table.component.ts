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
import { Table, SortableColumn, SortIcon } from 'primeng/table';
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
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
	providers: [ReleaseTableService],
	selector: 'mc-release-table',
	templateUrl: './release-table.component.html',
	styleUrls: ['./release-table.component.scss'],
	imports: [
		Bind,
		Table,
		SortableColumn,
		SortIcon,
		AutoComplete,
		Chip,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		DataView,
		CollectionViewToggleComponent,
		EntityCardComponent,
	],
})
export class ReleaseTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseTableService);

	public params$!: Observable<ReleaseTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	/** The cover of the release's album (uploaded, else found on the web). */
	public imageOf(release: ReleaseEntity): string | null {
		return (
			release.album?.coverImage?.filePath ||
			release.album?.coverImageUrl ||
			null
		);
	}

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
