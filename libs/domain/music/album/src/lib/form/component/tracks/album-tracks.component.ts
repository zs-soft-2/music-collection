import { Observable } from 'rxjs';

import { AsyncPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
	input,
} from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

import { AlbumTracksParams, AlbumTracksService } from './album-tracks.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumTracksService],
	selector: 'mc-album-tracks',
	templateUrl: './album-tracks.component.html',
	styleUrls: ['./album-tracks.component.scss'],
	imports: [AsyncPipe, Button, Dialog],
})
export class AlbumTracksComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumTracksService);

	public readonly albumId = input.required<string>();

	public params$!: Observable<AlbumTracksParams>;

	public readonly externalError = this.componentService.externalError;
	public readonly externalLoading = this.componentService.externalLoading;
	public readonly saving = this.componentService.saving;
	public readonly externalTracks = this.componentService.externalTracks;

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.albumId());
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
}
