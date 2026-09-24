import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import { FormsModule } from '@angular/forms';
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
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
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
	providers: [ReleaseTableService],
	selector: 'mc-release-table',
	templateUrl: './release-table.component.html',
	styleUrls: ['./release-table.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Chip,
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
export class ReleaseTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseTableService);

	public params$!: Observable<ReleaseTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	/** The cover of the release's album (uploaded, else found on the web). */
	public imageOf(release: ReleaseEntity): string | null {
		return (
			release.album?.coverImage?.filePath ||
			release.album?.coverImageUrl ||
			null
		);
	}

	public clearSearch(): void {
		this.componentService.clearSearch();
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

	/** Where the eye leads: the page that shows this release. */
	public viewLink(release: ReleaseEntity): unknown[] {
		return this.componentService.viewLink(release);
	}
}
