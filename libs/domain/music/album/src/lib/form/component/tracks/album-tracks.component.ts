import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import { AsyncPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
	input,
	signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseComponent, TrackEntity } from '@music-collection/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { AlbumTracksParams, AlbumTracksService } from './album-tracks.service';

/**
 * The album's own tracklist: loaded from MusicBrainz in one go, corrected by
 * hand track by track.
 *
 * What is edited here is what the record prints — the position, the title,
 * the length. The lyrics, the Spotify and YouTube links and the writers
 * belong to one song rather than to the list, and are edited on the track's
 * own page, which each title here links to.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumTracksService],
	selector: 'mc-album-tracks',
	templateUrl: './album-tracks.component.html',
	styleUrls: ['./album-tracks.component.scss'],
	imports: [
		...I18N_IMPORTS,
		AsyncPipe,
		Button,
		Dialog,
		InputText,
		RouterLink,
	],
})
export class AlbumTracksComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumTracksService);

	public readonly albumId = input.required<string>();

	public params$!: Observable<AlbumTracksParams>;

	public readonly error = this.componentService.error;
	public readonly externalError = this.componentService.externalError;
	public readonly externalLoading = this.componentService.externalLoading;
	public readonly saving = this.componentService.saving;
	public readonly externalTracks = this.componentService.externalTracks;
	public readonly removing = this.componentService.removing;

	/** The track whose row is an edit form; null while the list only reads. */
	public readonly editing = signal<TrackEntity | null>(null);
	public readonly position = signal('');
	public readonly name = signal('');
	public readonly duration = signal('');

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.albumId());
	}

	public edit(track: TrackEntity): void {
		this.editing.set(track);
		this.position.set(track.position ?? '');
		this.name.set(track.name);
		this.duration.set(track.duration ?? '');
	}

	public cancel(): void {
		this.editing.set(null);
		this.position.set('');
		this.name.set('');
		this.duration.set('');
	}

	public async save(): Promise<void> {
		const editing = this.editing();

		if (!editing) {
			return;
		}

		const saved = await this.componentService.save({
			uid: editing.uid,
			index: editing.index,
			position: this.position(),
			name: this.name(),
			duration: this.duration(),
		});

		if (saved) {
			this.cancel();
		}
	}

	public remove(track: TrackEntity): void {
		if (this.editing()?.uid === track.uid) {
			this.cancel();
		}
		this.componentService.askRemove(track);
	}

	public confirmRemove(): void {
		void this.componentService.confirmRemove();
	}

	public cancelRemove(): void {
		this.componentService.cancelRemove();
	}

	public text(event: Event): string {
		return (event.target as HTMLInputElement).value;
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
