import { Observable, shareReplay } from 'rxjs';

import { Injectable, inject } from '@angular/core';

import { PlayLogEntry } from './play-log.model';
import { PlayLogRepository } from './play-log.repository';

/**
 * The collector's listening log: the sittings the player records, and reading
 * them back. The stream is shared, so every page that shows a play count —
 * the album page, the profile — reads one cached list.
 */
@Injectable({ providedIn: 'root' })
export class PlayLogEffect {
	private readonly repository = inject(PlayLogRepository);

	private readonly entries$ = this.repository
		.list$()
		.pipe(shareReplay({ bufferSize: 1, refCount: true }));

	public list$(): Observable<PlayLogEntry[]> {
		return this.entries$;
	}

	/** Keeps a sitting. Signed out there is nowhere to keep it. */
	public record(entry: PlayLogEntry): Promise<void> {
		return this.repository.save(entry);
	}

	public get recording(): boolean {
		return this.repository.signedIn;
	}
}
