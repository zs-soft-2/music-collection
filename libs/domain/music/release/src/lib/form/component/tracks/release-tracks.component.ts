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
import { BaseComponent, TrackEntity } from '@music-collection/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

import {
	ReleaseTracksParams,
	ReleaseTracksService,
} from './release-tracks.service';

/**
 * The tracks this pressing added to the album.
 *
 * The album's own tracklist is shown above them, unchangeable from here: it
 * is the same on every pressing, and editing it belongs to the album. What
 * this form writes is only what the one edition has beyond it — the tenth
 * song on the Japanese release of a record that came out with nine.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ReleaseTracksService],
	selector: 'mc-release-tracks',
	templateUrl: './release-tracks.component.html',
	styleUrls: ['./release-tracks.component.scss'],
	imports: [AsyncPipe, Button, InputText],
})
export class ReleaseTracksComponent extends BaseComponent implements OnInit {
	private componentService = inject(ReleaseTracksService);

	public readonly releaseId = input.required<string>();

	public params$!: Observable<ReleaseTracksParams>;

	public readonly saving = this.componentService.saving;
	public readonly error = this.componentService.error;

	/** The track being edited; null while the form adds a new one. */
	public readonly editing = signal<TrackEntity | null>(null);
	public readonly position = signal('');
	public readonly name = signal('');
	public readonly duration = signal('');

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.releaseId());
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

	public async save(nextIndex: number): Promise<void> {
		const editing = this.editing();
		const saved = await this.componentService.save({
			uid: editing?.uid ?? null,
			index: editing?.index ?? nextIndex,
			position: this.position(),
			name: this.name(),
			duration: this.duration(),
		});

		if (saved) {
			this.cancel();
		}
	}

	public async remove(track: TrackEntity): Promise<void> {
		if (this.editing()?.uid === track.uid) {
			this.cancel();
		}
		await this.componentService.remove(track.uid);
	}

	public text(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}
}
