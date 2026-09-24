import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import { AsyncPipe, DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
	input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BaseComponent } from '@music-collection/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';

import { ArtistExternalCandidateRow } from '../artist-external-candidate';
import { ArtistCandidatePickerComponent } from '../candidate';
import {
	ArtistAlbumsParams,
	ArtistAlbumsService,
	ArtistExternalAlbumRow,
} from './artist-albums.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistAlbumsService],
	selector: 'mc-artist-albums',
	templateUrl: './artist-albums.component.html',
	styleUrls: ['./artist-albums.component.scss'],
	imports: [
		...I18N_IMPORTS,
		AsyncPipe,
		DatePipe,
		FormsModule,
		RouterLink,
		Button,
		Checkbox,
		Dialog,
		ArtistCandidatePickerComponent,
	],
})
export class ArtistAlbumsComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistAlbumsService);

	public readonly artistId = input.required<string>();

	public params$!: Observable<ArtistAlbumsParams>;

	public readonly externalAlbums = this.componentService.externalAlbums;
	public readonly externalCandidates =
		this.componentService.externalCandidates;
	public readonly externalError = this.componentService.externalError;
	public readonly externalLoading = this.componentService.externalLoading;
	public readonly externalSourceUrl = this.componentService.externalSourceUrl;
	public readonly selectedCount = computed(
		() => this.externalAlbums()?.filter((row) => row.selected).length ?? 0
	);

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.artistId());
	}

	public applyExternal(): void {
		this.componentService.applyExternal();
	}

	public chooseExternalCandidate(
		candidate: ArtistExternalCandidateRow
	): void {
		void this.componentService.chooseExternalCandidate(candidate);
	}

	public closeExternal(): void {
		this.componentService.closeExternal();
	}

	public closeExternalCandidates(): void {
		this.componentService.closeExternalCandidates();
	}

	public loadExternal(): void {
		void this.componentService.loadExternal();
	}

	public toggleAllExternalRows(selected: boolean): void {
		this.componentService.toggleAllExternalRows(selected);
	}

	public toggleExternalRow(row: ArtistExternalAlbumRow): void {
		this.componentService.toggleExternalRow(row);
	}
}
