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
		AsyncPipe,
		DatePipe,
		FormsModule,
		RouterLink,
		Button,
		Checkbox,
		Dialog,
	],
})
export class ArtistAlbumsComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistAlbumsService);

	public readonly artistId = input.required<string>();

	public params$!: Observable<ArtistAlbumsParams>;

	public readonly externalAlbums = this.componentService.externalAlbums;
	public readonly externalError = this.componentService.externalError;
	public readonly externalLoading = this.componentService.externalLoading;
	public readonly selectedCount = computed(
		() => this.externalAlbums()?.filter((row) => row.selected).length ?? 0
	);

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.artistId());
	}

	public applyExternal(): void {
		this.componentService.applyExternal();
	}

	public closeExternal(): void {
		this.componentService.closeExternal();
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
