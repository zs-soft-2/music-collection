import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import { AsyncPipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnInit,
	effect,
	inject,
	input,
	signal,
	viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseComponent, TrackEntity } from '@music-collection/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { AlbumTracksParams, AlbumTracksService } from './album-tracks.service';

/**
 * The album's own tracklist: loaded from MusicBrainz in one go, corrected by
 * hand track by track — or typed in from the sleeve, for a record no import
 * has ever listed.
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
	/** True while an empty row at the end of the list waits for a new track. */
	public readonly adding = signal(false);
	public readonly position = signal('');
	public readonly name = signal('');
	public readonly duration = signal('');

	private readonly newName =
		viewChild<ElementRef<HTMLInputElement>>('newName');

	public constructor() {
		super();

		// The empty row is drawn by the list, so it can only take the cursor
		// once it is there — which is one change detection after the button
		// was pressed.
		effect(() => {
			if (this.adding()) {
				this.newName()?.nativeElement.focus();
			}
		});
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.albumId());
	}

	public edit(track: TrackEntity): void {
		this.adding.set(false);
		this.editing.set(track);
		this.position.set(track.position ?? '');
		this.name.set(track.name);
		this.duration.set(track.duration ?? '');
	}

	/** Opens an empty row at the end of the list for a track of one's own. */
	public add(): void {
		this.editing.set(null);
		this.adding.set(true);
		this.clear();
	}

	public cancel(): void {
		this.editing.set(null);
		this.adding.set(false);
		this.clear();
	}

	public async save(): Promise<void> {
		if (this.adding()) {
			const added = await this.componentService.add({
				position: this.position(),
				name: this.name(),
				duration: this.duration(),
			});

			// A tracklist typed in by hand is typed in song by song, so the
			// row stays open with the cursor still in it.
			if (added) {
				this.clear();
			}

			return;
		}

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

	private clear(): void {
		this.position.set('');
		this.name.set('');
		this.duration.set('');
	}
}
