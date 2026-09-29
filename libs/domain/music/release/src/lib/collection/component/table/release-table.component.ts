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
	isReleaseArchived,
} from '@music-collection/api';

import { RELEASE_IN_USE } from '../../../deletion/release-deletion.effect';
import { provideReleaseDeletion } from '../../../deletion/release-deletion.providers';
import { ReleaseDeletionStore } from '../../../deletion/release-deletion.store';

import { ReleaseTableService } from './release-table.service';
import { Dialog } from 'primeng/dialog';
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
import { Ripple } from 'primeng/ripple';
import { Button, ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
	CollectionColumnDirective,
	CollectionListComponent,
	EntityCardComponent,
	ViewActionComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		ReleaseTableService,
		ReleaseDeletionStore,
		...provideReleaseDeletion(),
	],
	selector: 'mc-release-table',
	templateUrl: './release-table.component.html',
	styleUrls: ['./release-table.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Button,
		Chip,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		CollectionColumnDirective,
		CollectionListComponent,
		Dialog,
		EntityCardComponent,
		ViewActionComponent,
	],
})
export class ReleaseTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseTableService);

	/** The confirmation behind the trash icon; the template reads it. */
	public readonly deletion = inject(ReleaseDeletionStore);

	/** The one error the dialog has a sentence of its own for. */
	public readonly inUse = RELEASE_IN_USE;

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

	/**
	 * Asks before deleting, and asks the server what holds the pressing:
	 * what the dialog may offer depends on the answer.
	 */
	public deleteRelease(release: ReleaseEntity): void {
		this.deletion.ask(release);
	}

	/** Whether the pressing was archived — the list says so on the row. */
	public isArchived(release: ReleaseEntity): boolean {
		return isReleaseArchived(release);
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
